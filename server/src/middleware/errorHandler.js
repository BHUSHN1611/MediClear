import multer from 'multer'

export function errorHandler(err, req, res, next) {
  // Multer error handling
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File exceeds maximum allowed size of 10 MB.',
        code: 'FILE_TOO_LARGE',
      })
    }
    return res.status(400).json({
      error: `File upload error: ${err.message}`,
      code: 'UPLOAD_ERROR',
    })
  }

  // General server errors (no stack trace leaks, no PHI logged)
  const status = err.status || err.statusCode || 500
  const message =
    status === 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal Server Error'

  if (status >= 500) {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message)
  }

  return res.status(status).json({
    error: message,
    code: err.code || 'INTERNAL_ERROR',
  })
}
