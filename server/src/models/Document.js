import mongoose from 'mongoose'

const documentSchema = new mongoose.Schema(
  {
    consentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consent',
      required: false, // In resilient mode or tests, allows flexible linking
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    storedName: {
      type: String,
      required: true,
      unique: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
    },
    pageCount: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['uploaded', 'extracting', 'extracted', 'explaining', 'ready', 'error'],
      default: 'uploaded',
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index: documents automatically purged upon expiry
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

export const DocumentModel = mongoose.models.Document || mongoose.model('Document', documentSchema)
export default DocumentModel
