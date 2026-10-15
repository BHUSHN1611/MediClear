import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

export const config = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  CORS_ORIGIN_REGEX: process.env.CORS_ORIGIN_REGEX || '',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/mediclear',
  UPLOAD_DIR: process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(__dirname, '../../uploads'),
  DOCUMENT_RETENTION_DAYS: parseInt(process.env.DOCUMENT_RETENTION_DAYS || '30', 10),
  SESSION_COOKIE_NAME: 'mc_session',
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
}
