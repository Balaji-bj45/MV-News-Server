import dotenv from 'dotenv';

dotenv.config();

const parsedPort = Number.parseInt(process.env.PORT || '5000', 10);
const frontendUrls = [process.env.FRONTEND_URL, process.env.FRONTEND_URLS]
  .filter(Boolean)
  .flatMap((value) => value!.split(','))
  .map((url) => url.trim())
  .filter(Boolean);

export const ENV = {
  PORT: Number.isNaN(parsedPort) ? 5000 : parsedPort,
  MONGO_URI: process.env.MONGO_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || '*',
  FRONTEND_URLS: frontendUrls,
  YOUTUBE_CHANNEL_URL: process.env.YOUTUBE_CHANNEL_URL || 'https://www.youtube.com/@MVNewsBot',
  YOUTUBE_CHANNEL_ID: process.env.YOUTUBE_CHANNEL_ID || '',
  YOUTUBE_CHANNEL_FEED_LIMIT: Number.parseInt(process.env.YOUTUBE_CHANNEL_FEED_LIMIT || '12', 10) || 12,
};
