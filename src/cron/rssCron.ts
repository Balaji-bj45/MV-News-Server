import cron from 'node-cron';
import { fetchAndSaveRSS } from '../services/rss.service';

// Run cron job every 1 hour: "0 * * * *"
export const initCronJobs = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled RSS fetch job...');
    await fetchAndSaveRSS();
  });
  
  console.log('Cron jobs initialized');
};
