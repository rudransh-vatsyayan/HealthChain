const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://localhost:27017/healthchain',
      { serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS || 1500) }
    );
    console.log(`✅  MongoDB connected → ${conn.connection.host}`);
    process.env.USE_MEMORY_DB = 'false';
  } catch (err) {
    process.env.USE_MEMORY_DB = 'true';
    console.warn(`MongoDB unavailable (${err.message}). Using in-memory demo data.`);
  }
};

module.exports = connectDB;
