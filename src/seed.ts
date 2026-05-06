import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './models/User';
import connectDB from './config/db';
import { ENV } from './config/env';

const seedAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({ email: 'admin@mvnews.com' });

    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    await User.create({
      name: 'Super Admin',
      email: 'admin@mvnews.com',
      password: hashedPassword,
      role: 'admin',
    });

    console.log('Admin user seeded successfully. Email: admin@mvnews.com | Password: admin123');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  }
};

seedAdmin();
