import mongoose from 'mongoose'

const doctorQuestionItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    question: { type: String, required: true },
    category: { type: String, default: 'General' },
    rationale: { type: String, default: '' },
    source: {
      type: String,
      enum: ['document', 'general_suggestion'],
      default: 'document',
    },
  },
  { _id: false }
)

const doctorQuestionsSchema = new mongoose.Schema(
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
    questions: [doctorQuestionItemSchema],
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
doctorQuestionsSchema.index({ documentId: 1, language: 1 })
doctorQuestionsSchema.index({ documentIdStr: 1, language: 1 })

export const DoctorQuestionsModel =
  mongoose.models.DoctorQuestions ||
  mongoose.model('DoctorQuestions', doctorQuestionsSchema)
