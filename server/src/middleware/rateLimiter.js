import rateLimit from 'express-rate-limit'

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // Limit each IP / session to 150 requests per windowMs
  standardHeaders: true, // Return standard RateLimit headers
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this client. Please slow down and try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
})

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit document uploads to 15 per 15 minutes to protect server resources
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Upload limit exceeded. You can upload up to 15 documents per 15-minute window.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
  },
})
