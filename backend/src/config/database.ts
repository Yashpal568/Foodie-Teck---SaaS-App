import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000
  });
}
export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}
