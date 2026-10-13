import mongoose from 'mongoose'

const consentSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    consentedAt: {
      type: Date,
      default: Date.now,
    },
    ipHash: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      enum: ['en', 'hi'],
      default: 'en',
    },
    version: {
      type: String,
      default: '1.0',
    },
  },
  {
    timestamps: true,
  }
)

export const ConsentModel = mongoose.models.Consent || mongoose.model('Consent', consentSchema)
export default ConsentModel
