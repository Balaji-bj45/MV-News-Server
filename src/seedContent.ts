import mongoose from 'mongoose';
import connectDB from './config/db';
import { fetchAndSaveRSS } from './services/rss.service';

const seedContent = async () => {
  try {
    await connectDB();

    console.log('Fetching and saving RSS news...');
    await fetchAndSaveRSS();

    console.log('Skipping demo video seeds. Homepage videos now load from MVNewsBot plus admin-added fallback videos.');
    console.log('Content seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding content:', error);
    process.exit(1);
  }
};

seedContent();
