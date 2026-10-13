import mongoose from 'mongoose'

const extractedFieldSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    key: { type: String, required: true },
    value: { type: String, required: true },
    unit: { type: String, default: '' },
    referenceRange: { type: String, default: '' },
    status: {
      type: String,
      enum: ['normal', 'high', 'low', 'unspecified'],
      default: 'unspecified',
    },
    confidence: {
      type: String,
      enum: ['high', 'medium', 'low'],
      required: true,
    },
    isUserCorrected: { type: Boolean, default: false },
    originalValue: { type: String, default: null },
  },
  { _id: false }
)

const extractedDataSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: false, // In resilient mode/tests, allows string ID
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
    documentType: {
      type: String,
      enum: ['lab_report', 'prescription', 'discharge_instructions', 'unknown'],
      default: 'unknown',
    },
    rawText: {
      type: String,
      default: '',
    },
    fields: [extractedFieldSchema],
    uncertainties: [{ type: String }],
    isUnreadable: {
      type: Boolean,
      default: false,
    },
    extractedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

export const ExtractedDataModel =
  mongoose.models.ExtractedData || mongoose.model('ExtractedData', extractedDataSchema)
export default ExtractedDataModel
