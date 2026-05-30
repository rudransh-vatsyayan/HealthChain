import mongoose from 'mongoose';

const globalCache = globalThis;

if (!globalCache.__healthchainMongoose) {
  globalCache.__healthchainMongoose = { conn: null, promise: null };
}

const cache = globalCache.__healthchainMongoose;

const connectDB = async () => {
  if (cache.conn) return cache.conn;

  const timeout = Number(process.env.MONGO_TIMEOUT_MS) || (process.env.VERCEL ? 10000 : 1500);

  if (!cache.promise) {
    cache.promise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: timeout,
      maxPoolSize: process.env.VERCEL ? 1 : 10,
    }).then((conn) => {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    });
  }

  try {
    cache.conn = await cache.promise;
    return cache.conn;
  } catch (error) {
    cache.promise = null;
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (process.env.VERCEL) throw error;
    process.exit(1);
  }
};

export default connectDB;
