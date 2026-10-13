import mongoose from 'mongoose'

const extractedFactSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
    unit: { type: String, default: '' },
    source: { type: String, default: 'document' },
  },
  { _id: false }
)

const medicalTermSchema = new mongoose.Schema(
  {
    term: { type: String, required: true },
    simpleExplanation: { type: String, required: true },
    source: { type: String, default: 'educational_glossary' },
  },
  { _id: false }
)

const analysisSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: false,
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
      required: true,
      default: 'en',
    },
    documentType: {
      type: String,
      enum: ['lab_report', 'prescription', 'discharge_instructions', 'unknown'],
      default: 'unknown',
    },
    summary: [{ type: String }],
    extractedFacts: [extractedFactSchema],
    medicalTerms: [medicalTermSchema],
    uncertainties: [{ type: String }],
    safetyFlags: [{ type: String }],
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

export const AnalysisModel =
  mongoose.models.Analysis || mongoose.model('Analysis', analysisSchema)
export default AnalysisModel
