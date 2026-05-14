import * as cheerio from 'cheerio';
import { ENV } from '../config/env';

type VideoSourceType = 'manual' | 'channel';

export interface YoutubeVideoFeedItem {
  _id: string;
  youtubeId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt: string;
  tags: string[];
  isFeatureInterview: boolean;
  createdAt: string;
  updatedAt: string;
  sourceType: VideoSourceType;
}

const CHANNEL_CACHE_TTL_MS = 5 * 60 * 1000;
const YOUTUBE_REQUEST_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
};
let cachedChannelId: string | null = null;
let cachedVideos: YoutubeVideoFeedItem[] | null = null;
let cachedAt = 0;

const createAbortSignal = (timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  };
};

export const extractYoutubeVideoId = (input: string) => {
  const trimmedValue = input.trim();

  if (!trimmedValue) {
    return '';
  }

  const plainIdMatch = trimmedValue.match(/^[a-zA-Z0-9_-]{11}$/);
  if (plainIdMatch) {
    return plainIdMatch[0];
  }

  try {
    const url = new URL(trimmedValue);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();

    if (host === 'youtu.be') {
      const pathId = url.pathname.split('/').filter(Boolean)[0];
      return pathId && /^[a-zA-Z0-9_-]{11}$/.test(pathId) ? pathId : '';
    }

    if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      const queryId = url.searchParams.get('v');
      if (queryId && /^[a-zA-Z0-9_-]{11}$/.test(queryId)) {
        return queryId;
      }

      const segments = url.pathname.split('/').filter(Boolean);
      const candidate = segments[1];

      if (
        ['embed', 'shorts', 'live', 'watch'].includes(segments[0] ?? '') &&
        candidate &&
        /^[a-zA-Z0-9_-]{11}$/.test(candidate)
      ) {
        return candidate;
      }
    }
  } catch {
    return '';
  }

  return '';
};

export const createYoutubeThumbnailUrl = (youtubeId: string) =>
  `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;

const normalizeYoutubeVideoUrl = (value: string) => value.split('?')[0];

const extractChannelIdFromUrl = (channelUrl: string) => {
  const channelIdMatch = channelUrl.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/i);
  return channelIdMatch?.[1] ?? '';
};

const extractChannelHandleFromUrl = (channelUrl: string) => {
  try {
    const url = new URL(channelUrl);
    return (
      url.pathname
        .split('/')
        .filter(Boolean)
        .find((segment) => segment.startsWith('@')) ?? ''
    );
  } catch {
    return '';
  }
};

const normalizeChannelVideosUrl = (channelUrl: string) => {
  const trimmedUrl = channelUrl.trim().replace(/\/+$/g, '');

  if (!trimmedUrl) {
    return '';
  }

  return trimmedUrl.endsWith('/videos') ? trimmedUrl : `${trimmedUrl}/videos`;
};

const extractChannelIdFromMarkup = (markup: string) => {
  const channelIdPatterns = [
    /feeds\/videos\.xml\?channel_id=(UC[a-zA-Z0-9_-]+)/i,
    /https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/i,
    /"externalId":"(UC[a-zA-Z0-9_-]+)"/i,
    /"browseId":"(UC[a-zA-Z0-9_-]+)"/i,
    /itemprop="identifier"\s+content="(UC[a-zA-Z0-9_-]+)"/i,
  ];

  for (const pattern of channelIdPatterns) {
    const match = markup.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return '';
};

const extractInitialData = (html: string) => {
  const initialDataPatterns = [
    /var ytInitialData = (\{.*?\});<\/script>/s,
    /window\["ytInitialData"\]\s*=\s*(\{.*?\});/s,
    /window\['ytInitialData'\]\s*=\s*(\{.*?\});/s,
  ];

  for (const pattern of initialDataPatterns) {
    const match = html.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    try {
      return JSON.parse(match[1]) as Record<string, unknown>;
    } catch {
      continue;
    }
  }

  return null;
};

const getObjectValue = (value: unknown) => (value && typeof value === 'object' ? (value as Record<string, unknown>) : null);

const getNestedValue = (value: unknown, path: Array<string | number>) => {
  let currentValue: unknown = value;

  for (const key of path) {
    const currentObject = getObjectValue(currentValue);

    if (!currentObject || !(key in currentObject)) {
      return undefined;
    }

    currentValue = currentObject[key];
  }

  return currentValue;
};

const getTextValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => getTextValue(entry)).filter(Boolean).join('').trim();
  }

  const objectValue = getObjectValue(value);
  if (!objectValue) {
    return '';
  }

  if (typeof objectValue.simpleText === 'string') {
    return objectValue.simpleText.trim();
  }

  if (typeof objectValue.content === 'string') {
    return objectValue.content.trim();
  }

  if (Array.isArray(objectValue.runs)) {
    return objectValue.runs.map((run) => getTextValue(run)).filter(Boolean).join('').trim();
  }

  if (objectValue.text) {
    return getTextValue(objectValue.text);
  }

  return '';
};

const parseRelativePublishedAt = (relativeText: string) => {
  const normalizedText = relativeText.toLowerCase().trim();

  if (!normalizedText) {
    return null;
  }

  if (normalizedText.includes('just now') || normalizedText.includes('today')) {
    return new Date();
  }

  const match = normalizedText.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/);
  if (!match) {
    return null;
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];
  const publishedAt = new Date();

  if (Number.isNaN(amount)) {
    return null;
  }

  switch (unit) {
    case 'second':
      publishedAt.setSeconds(publishedAt.getSeconds() - amount);
      break;
    case 'minute':
      publishedAt.setMinutes(publishedAt.getMinutes() - amount);
      break;
    case 'hour':
      publishedAt.setHours(publishedAt.getHours() - amount);
      break;
    case 'day':
      publishedAt.setDate(publishedAt.getDate() - amount);
      break;
    case 'week':
      publishedAt.setDate(publishedAt.getDate() - amount * 7);
      break;
    case 'month':
      publishedAt.setMonth(publishedAt.getMonth() - amount);
      break;
    case 'year':
      publishedAt.setFullYear(publishedAt.getFullYear() - amount);
      break;
    default:
      return null;
  }

  return publishedAt;
};

const extractMetadataRows = (node: unknown) => {
  const rows =
    getNestedValue(node, ['lockupViewModel', 'metadata', 'lockupMetadataViewModel', 'metadata', 'contentMetadataViewModel', 'metadataRows']) ??
    getNestedValue(node, ['metadata', 'lockupMetadataViewModel', 'metadata', 'contentMetadataViewModel', 'metadataRows']);

  return Array.isArray(rows) ? rows : [];
};

const extractMetadataRowTexts = (node: unknown) =>
  extractMetadataRows(node)
    .map((row) => {
      const rowObject = getObjectValue(row);
      const metadataParts = Array.isArray(rowObject?.metadataParts) ? rowObject.metadataParts : [];

      return metadataParts.map((part) => getTextValue(part)).filter(Boolean).join(' • ').trim();
    })
    .filter(Boolean);

const buildYoutubeVideoFromLockup = (node: unknown): YoutubeVideoFeedItem | null => {
  const youtubeId =
    getTextValue(getNestedValue(node, ['contentId'])) ||
    getTextValue(getNestedValue(node, ['rendererContext', 'commandContext', 'onTap', 'innertubeCommand', 'watchEndpoint', 'videoId'])) ||
    extractYoutubeVideoId(getTextValue(getNestedValue(node, ['rendererContext', 'commandContext', 'onTap', 'innertubeCommand', 'commandMetadata', 'webCommandMetadata', 'url'])));

  if (!youtubeId) {
    return null;
  }

  const title =
    getTextValue(getNestedValue(node, ['lockupViewModel', 'metadata', 'lockupMetadataViewModel', 'title'])) ||
    getTextValue(getNestedValue(node, ['metadata', 'lockupMetadataViewModel', 'title'])) ||
    `MVNewsBot video ${youtubeId}`;
  const metadataRowTexts = extractMetadataRowTexts(node);
  const relativePublishedText =
    metadataRowTexts
      .flatMap((rowText) => rowText.split('•').map((part) => part.trim()))
      .find((part) => /(?:second|minute|hour|day|week|month|year)s?\s+ago/i.test(part)) ?? '';
  const publishedAt = parseRelativePublishedAt(relativePublishedText)?.toISOString() ?? new Date().toISOString();
  const description =
    metadataRowTexts.find((rowText) => !/\bviews?\b/i.test(rowText) && !/\bago\b/i.test(rowText)) || undefined;
  const thumbnailUrl =
    normalizeYoutubeVideoUrl(
      getTextValue(getNestedValue(node, ['lockupViewModel', 'contentImage', 'thumbnailViewModel', 'image', 'sources', 3, 'url'])) ||
        getTextValue(getNestedValue(node, ['lockupViewModel', 'contentImage', 'thumbnailViewModel', 'image', 'sources', 2, 'url'])) ||
        getTextValue(getNestedValue(node, ['lockupViewModel', 'contentImage', 'thumbnailViewModel', 'image', 'sources', 1, 'url'])) ||
        getTextValue(getNestedValue(node, ['lockupViewModel', 'contentImage', 'thumbnailViewModel', 'image', 'sources', 0, 'url'])) ||
        createYoutubeThumbnailUrl(youtubeId)
    );

  return {
    _id: `channel-${youtubeId}`,
    youtubeId,
    title,
    description,
    thumbnailUrl,
    publishedAt,
    tags: ['mvnewsbot', 'youtube'],
    isFeatureInterview: false,
    createdAt: publishedAt,
    updatedAt: publishedAt,
    sourceType: 'channel',
  };
};

const collectYoutubeVideosFromNode = (
  node: unknown,
  videos: YoutubeVideoFeedItem[] = [],
  seenIds = new Set<string>()
) => {
  if (!node) {
    return videos;
  }

  if (Array.isArray(node)) {
    node.forEach((entry) => collectYoutubeVideosFromNode(entry, videos, seenIds));
    return videos;
  }

  const objectValue = getObjectValue(node);
  if (!objectValue) {
    return videos;
  }

  const maybeVideo = buildYoutubeVideoFromLockup(objectValue);
  if (maybeVideo && !seenIds.has(maybeVideo.youtubeId)) {
    seenIds.add(maybeVideo.youtubeId);
    videos.push(maybeVideo);
  }

  Object.values(objectValue).forEach((entry) => collectYoutubeVideosFromNode(entry, videos, seenIds));
  return videos;
};

const extractVideosTabContents = (initialData: Record<string, unknown>) => {
  const tabs = getNestedValue(initialData, ['contents', 'twoColumnBrowseResultsRenderer', 'tabs']);

  if (!Array.isArray(tabs)) {
    return [];
  }

  for (const tab of tabs) {
    const content =
      getNestedValue(tab, ['tabRenderer', 'content', 'richGridRenderer', 'contents']) ??
      getNestedValue(tab, ['expandableTabRenderer', 'content', 'richGridRenderer', 'contents']);

    if (Array.isArray(content) && content.length) {
      return content;
    }
  }

  return [];
};

const fetchYoutubeText = async (url: string, timeoutMs = 10000) => {
  const { signal, clear } = createAbortSignal(timeoutMs);

  try {
    const response = await fetch(url, {
      headers: YOUTUBE_REQUEST_HEADERS,
      signal,
    });

    if (!response.ok) {
      throw new Error(`Unable to load YouTube page: ${response.status}`);
    }

    return await response.text();
  } finally {
    clear();
  }
};

const fetchYoutubeChannelVideosFromPage = async (limit: number) => {
  const candidateUrls = [
    normalizeChannelVideosUrl(ENV.YOUTUBE_CHANNEL_URL),
    ...(extractChannelHandleFromUrl(ENV.YOUTUBE_CHANNEL_URL)
      ? [
          `https://www.youtube.com/${extractChannelHandleFromUrl(ENV.YOUTUBE_CHANNEL_URL)}/videos`,
        ]
      : []),
  ].filter(Boolean);

  for (const candidateUrl of [...new Set(candidateUrls)]) {
    try {
      const html = await fetchYoutubeText(candidateUrl);
      const resolvedChannelId = extractChannelIdFromMarkup(html);

      if (resolvedChannelId) {
        cachedChannelId = resolvedChannelId;
      }

      const initialData = extractInitialData(html);
      if (!initialData) {
        continue;
      }

      const videos = collectYoutubeVideosFromNode(extractVideosTabContents(initialData))
        .sort((firstVideo, secondVideo) => {
          return new Date(secondVideo.publishedAt).getTime() - new Date(firstVideo.publishedAt).getTime();
        })
        .slice(0, limit);

      if (videos.length) {
        return videos;
      }
    } catch {
      continue;
    }
  }

  throw new Error('Unable to parse videos from the public YouTube channel page.');
};

const resolveYoutubeChannelId = async () => {
  if (cachedChannelId) {
    return cachedChannelId;
  }

  const configuredChannelId = ENV.YOUTUBE_CHANNEL_ID.trim();
  if (configuredChannelId) {
    cachedChannelId = configuredChannelId;
    return configuredChannelId;
  }

  const directChannelId = extractChannelIdFromUrl(ENV.YOUTUBE_CHANNEL_URL);
  if (directChannelId) {
    cachedChannelId = directChannelId;
    return directChannelId;
  }

  const candidateUrls = [
    ENV.YOUTUBE_CHANNEL_URL,
    normalizeChannelVideosUrl(ENV.YOUTUBE_CHANNEL_URL),
    ...(extractChannelHandleFromUrl(ENV.YOUTUBE_CHANNEL_URL)
      ? [
          `https://www.youtube.com/${extractChannelHandleFromUrl(ENV.YOUTUBE_CHANNEL_URL)}`,
          `https://www.youtube.com/${extractChannelHandleFromUrl(ENV.YOUTUBE_CHANNEL_URL)}/videos`,
        ]
      : []),
  ].filter(Boolean);

  for (const candidateUrl of [...new Set(candidateUrls)]) {
    try {
      const html = await fetchYoutubeText(candidateUrl);
      const resolvedChannelId = extractChannelIdFromMarkup(html);

      if (!resolvedChannelId) {
        continue;
      }

      cachedChannelId = resolvedChannelId;
      return resolvedChannelId;
    } catch {
      continue;
    }
  }

  throw new Error('Unable to resolve the YouTube channel ID.');
};

const parseYoutubeFeed = (feedXml: string) => {
  const $ = cheerio.load(feedXml, { xmlMode: true });
  const items: YoutubeVideoFeedItem[] = [];

  $('entry').each((_index, entry) => {
    const youtubeId =
      $(entry).find('yt\\:videoId').first().text().trim() ||
      $(entry).find('videoId').first().text().trim();

    if (!youtubeId) {
      return;
    }

    const title = $(entry).find('title').first().text().trim();
    const description =
      $(entry).find('media\\:description').first().text().trim() ||
      $(entry).find('description').first().text().trim() ||
      undefined;
    const publishedAt =
      $(entry).find('published').first().text().trim() ||
      $(entry).find('updated').first().text().trim() ||
      new Date().toISOString();
    const thumbnailUrl =
      $(entry).find('media\\:thumbnail').first().attr('url') || createYoutubeThumbnailUrl(youtubeId);

    items.push({
      _id: `channel-${youtubeId}`,
      youtubeId,
      title,
      description,
      thumbnailUrl,
      publishedAt,
      tags: ['mvnewsbot', 'youtube'],
      isFeatureInterview: false,
      createdAt: publishedAt,
      updatedAt: publishedAt,
      sourceType: 'channel',
    });
  });

  return items;
};

export const fetchYoutubeChannelVideos = async (limit = ENV.YOUTUBE_CHANNEL_FEED_LIMIT) => {
  const now = Date.now();

  if (cachedVideos && now - cachedAt < CHANNEL_CACHE_TTL_MS && cachedVideos.length >= limit) {
    return cachedVideos.slice(0, limit);
  }

  const channelId = await resolveYoutubeChannelId();
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const { signal, clear } = createAbortSignal(10000);

  try {
    const response = await fetch(feedUrl, {
      headers: YOUTUBE_REQUEST_HEADERS,
      signal,
    });

    if (!response.ok) {
      const fallbackVideos = await fetchYoutubeChannelVideosFromPage(limit);
      cachedVideos = fallbackVideos;
      cachedAt = now;
      return fallbackVideos;
    }

    const feedXml = await response.text();
    const parsedVideos = parseYoutubeFeed(feedXml)
      .sort((firstVideo, secondVideo) => {
        return new Date(secondVideo.publishedAt).getTime() - new Date(firstVideo.publishedAt).getTime();
      })
      .slice(0, limit);

    if (!parsedVideos.length) {
      const fallbackVideos = await fetchYoutubeChannelVideosFromPage(limit);
      cachedVideos = fallbackVideos;
      cachedAt = now;
      return fallbackVideos;
    }

    cachedVideos = parsedVideos;
    cachedAt = now;

    return parsedVideos;
  } catch (error) {
    try {
      const fallbackVideos = await fetchYoutubeChannelVideosFromPage(limit);
      cachedVideos = fallbackVideos;
      cachedAt = now;
      return fallbackVideos;
    } catch {
      // If YouTube blocks a fresh request, keep serving the latest successful cache.
    }

    if (cachedVideos?.length) {
      return cachedVideos.slice(0, limit);
    }

    throw error;
  } finally {
    clear();
  }
};
