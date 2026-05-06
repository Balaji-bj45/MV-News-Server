import connectDB from './config/db';
import { fetchAndSaveRSS } from './services/rss.service';

const run = async () => {
  await connectDB();
  await fetchAndSaveRSS();
  process.exit(0);
};

run();
