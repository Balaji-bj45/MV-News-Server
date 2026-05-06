import Parser from 'rss-parser';
import News from '../models/News';
import { generateSlug } from '../utils/slugify';
import * as cheerio from 'cheerio';

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['media:content', 'mediaContent'],
      ['enclosure', 'enclosure']
    ],
  }
});

interface FeedConfig {
  url: string;
  category: 'tamilnadu' | 'india';
}

const FEEDS: FeedConfig[] = [
  { url: 'https://indianexpress.com/section/political-pulse/feed/', category: 'india' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/805178044.cms', category: 'india' },
  { url: 'https://feeds.feedburner.com/ndtvnews-india-news', category: 'india' },
  { url: 'https://feeds.bbci.co.uk/tamil/rss.xml', category: 'tamilnadu' },
  { url: 'http://rss.dinamalar.com/tamilnadunews.asp', category: 'tamilnadu' },
  { url: 'https://www.dinakaran.com/rss_dkn.asp', category: 'tamilnadu' },
  { url: 'https://tamil.oneindia.com/rss/tamilnadu.xml', category: 'tamilnadu' },
  { url: 'https://www.vikatan.com/rss', category: 'tamilnadu' },
  { url: 'https://zeenews.india.com/tamil/rss.html', category: 'tamilnadu' },
];

async function fetchFullContent(url: string, originalContent: string, originalImageUrl: string) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return { content: originalContent, imageUrl: originalImageUrl };
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let paragraphs: string[] = [];
    $('article p, .story-details p, .article-content p, .Normal, .content_text p').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 50) paragraphs.push(`<p>${text}</p>`);
    });
    
    if (paragraphs.length === 0) {
      $('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 60 && !text.includes('Copyright') && !text.includes('All rights reserved')) {
          paragraphs.push(`<p>${text}</p>`);
        }
      });
    }

    let imageUrl = originalImageUrl;
    if (!imageUrl) {
      const ogImage = $('meta[property="og:image"]').attr('content');
      if (ogImage) imageUrl = ogImage;
    }
    
    let additionalImages: string[] = [];
    $('article img, .story-details img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('avatar') && !src.includes('icon')) {
        additionalImages.push(`<figure><img src="${src}" alt="Article inline image" style="margin: 24px 0; border-radius: 12px; width: 100%; max-height: 500px; object-fit: cover;" /></figure>`);
      }
    });

    paragraphs = paragraphs.slice(0, 20); // About 50-60 lines
    
    if (additionalImages.length > 0 && paragraphs.length > 3) {
      paragraphs.splice(2, 0, additionalImages[0]);
    }
    if (additionalImages.length > 1 && paragraphs.length > 7) {
      paragraphs.splice(6, 0, additionalImages[1]);
    }
    
    const fullContent = paragraphs.length > 3 ? paragraphs.join('') : originalContent;
    return { content: fullContent, imageUrl };
  } catch (err) {
    return { content: originalContent, imageUrl: originalImageUrl };
  }
}

export const fetchAndSaveRSS = async () => {
  console.log('Starting RSS fetch job...');

  for (const feedConfig of FEEDS) {
    try {
      const feed = await parser.parseURL(feedConfig.url);
      
      let savedCount = 0;
      // Process top 10 items per feed to avoid extreme scraping time
      const itemsToProcess = feed.items.slice(0, 10);
      
      for (const item of itemsToProcess) {
        if (!item.link) continue;

        let title = item.title || 'Untitled';
        let slug = generateSlug(title);
        const uniqueId = Math.random().toString(36).substring(2, 8);
        slug = `${slug}-${uniqueId}`;

        let imageUrl = '';
        if (item.enclosure && item.enclosure.url && item.enclosure.url.match(/\.(jpeg|jpg|gif|png)$/i)) {
          imageUrl = item.enclosure.url;
        } else if (item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) {
          imageUrl = item.mediaContent.$.url;
        } else if (item.contentEncoded) {
          const imgMatch = item.contentEncoded.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch) imageUrl = imgMatch[1];
        } else if (item.content) {
          const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch) imageUrl = imgMatch[1];
        }

        const baseContent = item.contentEncoded || item.content || item.contentSnippet || '';
        
        console.log(`Scraping full content for: ${title.slice(0, 30)}...`);
        const { content: scrapedContent, imageUrl: scrapedImage } = await fetchFullContent(item.link, baseContent, imageUrl);

        const itemToSave = {
          title: title,
          description: item.contentSnippet || item.content || '',
          content: scrapedContent,
          imageUrl: scrapedImage,
          source: feed.title || 'RSS Feed',
          sourceUrl: item.link || '',
          category: feedConfig.category,
          isManual: false,
          publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
        };

        const updated = await News.findOneAndUpdate(
          { sourceUrl: itemToSave.sourceUrl },
          { 
            $set: itemToSave,
            $setOnInsert: { slug: slug } 
          },
          { upsert: true, new: true }
        );
        
        if (updated) {
           savedCount++;
        }
      }

      console.log(`Successfully processed ${savedCount} items from ${feedConfig.url}`);
    } catch (error) {
      console.error(`Error fetching RSS feed ${feedConfig.url}:`, error);
    }
  }
  console.log('Finished RSS fetch job.');
};
