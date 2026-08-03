import mongoose from "mongoose";

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  const uri = process.env.MONGO_URI!;

  try {
    await mongoose.connect(uri, {
      // Mongoose 8 uses these as defaults; explicit for clarity:
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
    });
    isConnected = true;
    console.log("[db] Connected to MongoDB Atlas");

    mongoose.connection.on("error", (err) => {
      console.error("[db] MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      isConnected = false;
      console.warn("[db] MongoDB disconnected — will reconnect automatically");
    });
  } catch (err) {
    console.error("[db] Failed to connect to MongoDB Atlas:", err);
    process.exit(1);
  }
}
