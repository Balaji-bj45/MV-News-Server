import cron from 'node-cron';
import { fetchAndSaveRSS } from '../services/rss.service';

// Run cron job every 1 hour: "0 * * * *"
export const initCronJobs = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled RSS fetch job...');
    await fetchAndSaveRSS();
  });
  
  // For deployments like Render that sleep, fetch immediately on startup
  setTimeout(() => {
    console.log('Running initial RSS fetch job on startup...');
    fetchAndSaveRSS().catch(console.error);
  }, 5000);

  console.log('Cron jobs initialized');
};
