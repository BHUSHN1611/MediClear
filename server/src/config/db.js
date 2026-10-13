import mongoose from 'mongoose'
import { config } from './env.js'

let isConnected = false

export async function connectDB(uri = config.MONGODB_URI) {
  if (isConnected || mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000, // Quick timeout for local resilience
    })
    isConnected = true
    console.log(`[Database] MongoDB connected: ${conn.connection.host}`)
    return conn.connection
  } catch (err) {
    isConnected = false
    console.warn(`[Database] MongoDB connection notice: ${err.message}. Running in resilient local mode.`)
    return null
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
    isConnected = false
    console.log('[Database] MongoDB disconnected cleanly')
  }
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1
}
