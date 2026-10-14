import mongoose from 'mongoose'

const checklistItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'general' },
    source: {
      type: String,
      enum: ['document', 'general_suggestion'],
      default: 'document',
    },
    isCompleted: { type: Boolean, default: false },
  },
  { _id: false }
)

const checklistSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    documentIdStr: {
      type: String,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    language: {
      type: String,
      enum: ['en', 'hi'],
      default: 'en',
    },
    documentType: {
      type: String,
      enum: ['lab_report', 'prescription', 'discharge_instructions', 'unknown'],
      default: 'unknown',
    },
    items: [checklistItemSchema],
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

// Index for lookups by document and language
checklistSchema.index({ documentId: 1, language: 1 })
checklistSchema.index({ documentIdStr: 1, language: 1 })

export const ChecklistModel =
  mongoose.models.Checklist || mongoose.model('Checklist', checklistSchema)
