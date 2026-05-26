import mongoose from 'mongoose';
import { ENV } from './env';
import Advertisement from '../models/Advertisement';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(ENV.MONGO_URI);
    await Advertisement.syncIndexes();
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

export default connectDB;
