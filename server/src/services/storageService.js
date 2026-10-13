import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config/env.js'

/**
 * StorageService Interface:
 * Abstract contract for storing, retrieving, and deleting patient medical documents.
 * 
 * PRODUCTION ARCHITECTURE NOTE:
 * In local development, LocalStorageService persists files to a private local folder.
 * On ephemeral cloud platforms (e.g., Render free tier, Vercel serverless), local disks
 * are wiped on restart or dyno cycling.
 * 
 * For production deployment, implement CloudStorageService implementing this interface
 * using private cloud buckets (e.g., AWS S3 with Server-Side Encryption AES-256 or
 * Cloudinary/GCS with private ACLs and time-limited pre-signed URLs).
 */
export class StorageService {
  async saveFile({ buffer, originalName, mimeType }) {
    throw new Error('Method saveFile() must be implemented by storage provider')
  }

  async getFile(storedName) {
    throw new Error('Method getFile() must be implemented by storage provider')
  }

  async deleteFile(storedName) {
    throw new Error('Method deleteFile() must be implemented by storage provider')
  }

  async fileExists(storedName) {
    throw new Error('Method fileExists() must be implemented by storage provider')
  }
}

/**
 * LocalStorageService — Local development storage implementation.
 * Stores files privately on local disk. Uploads directory is excluded from web server roots
 * and never exposed via public static routes.
 */
export class LocalStorageService extends StorageService {
  constructor(uploadDir = config.UPLOAD_DIR) {
    super()
    this.uploadDir = uploadDir
    this._ensureDirectory()
  }

  _ensureDirectory() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true, mode: 0o700 })
    }
  }

  _sanitizeExtension(filename) {
    const ext = path.extname(filename).toLowerCase()
    return ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext) ? ext : '.bin'
  }

  async saveFile({ buffer, originalName, mimeType }) {
    this._ensureDirectory()
    const ext = this._sanitizeExtension(originalName)
    const storedName = `${uuidv4()}${ext}`
    const targetPath = path.join(this.uploadDir, storedName)

    await fs.promises.writeFile(targetPath, buffer, { mode: 0o600 })

    return {
      storedName,
      filePath: targetPath,
      sizeBytes: buffer.length,
      mimeType,
    }
  }

  async getFile(storedName) {
    // Prevent path traversal
    const safeName = path.basename(storedName)
    const targetPath = path.join(this.uploadDir, safeName)

    if (!fs.existsSync(targetPath)) {
      throw new Error(`File ${safeName} not found in storage`)
    }

    return await fs.promises.readFile(targetPath)
  }

  async deleteFile(storedName) {
    const safeName = path.basename(storedName)
    const targetPath = path.join(this.uploadDir, safeName)

    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath)
      return true
    }
    return false
  }

  async fileExists(storedName) {
    const safeName = path.basename(storedName)
    const targetPath = path.join(this.uploadDir, safeName)
    return fs.existsSync(targetPath)
  }
}

// Default singleton instance
export const storageService = new LocalStorageService()
