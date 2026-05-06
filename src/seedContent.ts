import mongoose from 'mongoose';
import connectDB from './config/db';
import { fetchAndSaveRSS } from './services/rss.service';
import Video from './models/Video';

const seedContent = async () => {
  try {
    await connectDB();

    console.log('Fetching and saving RSS news...');
    await fetchAndSaveRSS();

    console.log('Seeding trending political videos...');
    const videos = [
      {
        youtubeId: 'F40P_fF3QhA',
        title: 'PM Modi Exclusive Interview',
        description: 'Prime Minister Narendra Modi speaks exclusively on various political issues ahead of the elections.',
        thumbnailUrl: 'https://img.youtube.com/vi/F40P_fF3QhA/maxresdefault.jpg',
        tags: ['politics', 'india', 'modi'],
        isFeatureInterview: true,
      },
      {
        youtubeId: 'Oq511o8y50o',
        title: 'Rahul Gandhi Addresses Rally',
        description: 'Congress leader Rahul Gandhi addresses a massive rally, talking about key manifesto points.',
        thumbnailUrl: 'https://img.youtube.com/vi/Oq511o8y50o/maxresdefault.jpg',
        tags: ['politics', 'india', 'rahul gandhi'],
        isFeatureInterview: false,
      },
      {
        youtubeId: 'R7f8gYyPjA0',
        title: 'Tamil Nadu Election Debate',
        description: 'A heated debate among key political figures in Tamil Nadu ahead of the upcoming state elections.',
        thumbnailUrl: 'https://img.youtube.com/vi/R7f8gYyPjA0/maxresdefault.jpg',
        tags: ['politics', 'tamil nadu', 'debate'],
        isFeatureInterview: true,
      },
      {
        youtubeId: 'xP2j3-6g9L4',
        title: 'Election Results Live Coverage',
        description: 'Live coverage and analysis of the latest election results across the country.',
        thumbnailUrl: 'https://img.youtube.com/vi/xP2j3-6g9L4/maxresdefault.jpg',
        tags: ['politics', 'india', 'election', 'live'],
        isFeatureInterview: false,
      }
    ];

    for (const video of videos) {
      await Video.findOneAndUpdate(
        { youtubeId: video.youtubeId },
        { $set: video },
        { upsert: true }
      );
    }
    
    console.log('Content seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding content:', error);
    process.exit(1);
  }
};

seedContent();
