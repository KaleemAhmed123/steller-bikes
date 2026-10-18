import mongoose from 'mongoose';
import { config } from './config.js';

// Connect to MongoDB once at startup. Mongoose keeps and reuses the connection pool.
export async function connectDb(): Promise<void> {
  await mongoose.connect(config.MONGODB_URI, { dbName: 'raju-cycles' });
  console.log('Connected to MongoDB');
}
