import mongoose from 'mongoose';

const connectDB = async (retries = 5) => {
  while (retries > 0) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI);
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      retries -= 1;
      console.error(`❌ MongoDB Connection Error: ${error.message} (${retries} retries left)`);
      if (retries === 0) process.exit(1);
      // Wait 3 seconds before retrying
      await new Promise(res => setTimeout(res, 3000));
    }
  }
};

export default connectDB;
