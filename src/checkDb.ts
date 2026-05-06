import connectDB from './config/db';
import News from './models/News';

const run = async () => {
  await connectDB();
  const count = await News.countDocuments({ category: 'tamilnadu' });
  const allCount = await News.countDocuments();
  console.log('Tamil Nadu news count:', count);
  console.log('All news count:', allCount);
  process.exit(0);
};

run();
