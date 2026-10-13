import multer from 'multer'
import path from 'path'
import { fileTypeFromBuffer } from 'file-type'
import { config } from '../config/env.js'

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

// Configure Multer with memory storage so magic bytes are validated BEFORE persisting
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.MAX_FILE_SIZE_BYTES, // 10MB
    files: 1, // Only 1 file per upload request
  },
})

export const uploadSingleFile = upload.single('file')

/**
 * fileValidatorMiddleware:
 * Deep validation of uploaded file:
 * 1. Checks file presence
 * 2. Checks file size
 * 3. Checks file extension
 * 4. Checks claimed MIME type
 * 5. Inspects byte signature / magic bytes via fileTypeFromBuffer to defeat file spoofing
 */
export async function validateUploadedFile(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      error: 'No document file provided. Please attach a file under form field "file".',
      code: 'MISSING_FILE',
    })
  }

  const { originalname, size, mimetype, buffer } = req.file

  // 1. File size check (Multer limit fallback)
  if (size > config.MAX_FILE_SIZE_BYTES) {
    return res.status(400).json({
      error: 'File exceeds maximum allowed size of 10 MB.',
      code: 'FILE_TOO_LARGE',
    })
  }

  // 2. Extension check
  const ext = path.extname(originalname).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return res.status(400).json({
      error: `Unsupported file extension (${ext}). Allowed extensions: .pdf, .jpg, .jpeg, .png`,
      code: 'INVALID_EXTENSION',
    })
  }

  // 3. Claimed MIME check
  if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
    return res.status(400).json({
      error: `Unsupported MIME type (${mimetype}). Allowed types: PDF, JPEG, PNG`,
      code: 'INVALID_MIME_TYPE',
    })
  }

  // 4. Magic bytes inspection
  try {
    const detected = await fileTypeFromBuffer(buffer)

    // For PDF files, PDF header starts with %PDF- (0x25 0x50 0x44 0x46)
    const isPdfHeader = buffer.slice(0, 5).toString('ascii').startsWith('%PDF-')

    if (ext === '.pdf') {
      if (!isPdfHeader && detected?.mime !== 'application/pdf') {
        return res.status(400).json({
          error: 'File content does not match a valid PDF document signature.',
          code: 'SPOOFED_FILE_TYPE',
        })
      }
    } else {
      if (!detected || !ALLOWED_MIME_TYPES.includes(detected.mime)) {
        return res.status(400).json({
          error: 'File content signature does not match allowed image formats.',
          code: 'SPOOFED_FILE_TYPE',
        })
      }
    }

    req.file.validatedMimeType = detected ? detected.mime : mimetype
    next()
  } catch (err) {
    return res.status(400).json({
      error: 'Failed to verify file integrity.',
      code: 'FILE_VERIFICATION_FAILED',
    })
  }
}
