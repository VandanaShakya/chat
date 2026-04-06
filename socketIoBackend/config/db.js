// config/db.js
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    console.log("🔗 Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGO_URL, {
     });

    console.log("✅ MongoDB Connected Successfully");

  } catch (error) {
    console.error("❌ MongoDB NOT connected:", error.message);
    throw error; // VERY IMPORTANT
  }
};

export default connectDB;