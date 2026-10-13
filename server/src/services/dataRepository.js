import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { isDbConnected } from '../config/db.js'
import ConsentModel from '../models/Consent.js'
import DocumentModel from '../models/Document.js'
import ExtractedDataModel from '../models/ExtractedData.js'
import AnalysisModel from '../models/Analysis.js'

// In-memory fallback stores (active when running offline/in-memory test mode)
const memoryConsents = new Map()
const memoryDocuments = new Map()
const memoryExtractedData = new Map()
const memoryAnalyses = new Map()

export const dataRepository = {
  // === CONSENT METHODS ===
  async createConsent({ sessionId, language = 'en', version = '1.0', ipHash }) {
    if (isDbConnected()) {
      const consent = await ConsentModel.create({
        sessionId,
        language,
        version,
        ipHash,
        consentedAt: new Date(),
      })
      return consent.toObject ? consent.toObject() : consent
    }

    const id = uuidv4()
    const consent = {
      _id: id,
      id,
      sessionId,
      language,
      version,
      ipHash,
      consentedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    memoryConsents.set(sessionId, consent)
    return consent
  },

  async findConsentBySession(sessionId) {
    if (isDbConnected()) {
      const consent = await ConsentModel.findOne({ sessionId }).sort({ createdAt: -1 })
      return consent ? (consent.toObject ? consent.toObject() : consent) : null
    }

    return memoryConsents.get(sessionId) || null
  },

  // === DOCUMENT METHODS ===
  async createDocument({
    consentId,
    sessionId,
    originalName,
    storedName,
    mimeType,
    sizeBytes,
    pageCount = 1,
    status = 'uploaded',
    expiresAt,
  }) {
    if (isDbConnected()) {
      const doc = await DocumentModel.create({
        consentId,
        sessionId,
        originalName,
        storedName,
        mimeType,
        sizeBytes,
        pageCount,
        status,
        expiresAt,
      })
      return doc.toObject ? doc.toObject() : doc
    }

    const id = uuidv4()
    const doc = {
      _id: id,
      id,
      consentId,
      sessionId,
      originalName,
      storedName,
      mimeType,
      sizeBytes,
      pageCount,
      status,
      errorMessage: null,
      expiresAt,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    memoryDocuments.set(id, doc)
    return doc
  },

  async findDocumentById(documentId) {
    if (isDbConnected()) {
      const doc = await DocumentModel.findById(documentId)
      return doc ? (doc.toObject ? doc.toObject() : doc) : null
    }

    return memoryDocuments.get(documentId) || null
  },

  async updateDocumentStatus(documentId, status, errorMessage = null) {
    if (isDbConnected()) {
      const doc = await DocumentModel.findByIdAndUpdate(
        documentId,
        { status, errorMessage, updatedAt: new Date() },
        { new: true }
      )
      return doc ? (doc.toObject ? doc.toObject() : doc) : null
    }

    const doc = memoryDocuments.get(documentId)
    if (doc) {
      doc.status = status
      doc.errorMessage = errorMessage
      doc.updatedAt = new Date()
      return doc
    }
    return null
  },

  async deleteDocument(documentId) {
    if (isDbConnected()) {
      await ExtractedDataModel.deleteMany({
        $or: [{ documentId }, { documentIdStr: documentId }],
      })
      await AnalysisModel.deleteMany({
        $or: [{ documentId }, { documentIdStr: documentId }],
      })
      const result = await DocumentModel.findByIdAndDelete(documentId)
      return !!result
    }

    memoryExtractedData.delete(documentId)
    memoryAnalyses.delete(documentId)
    return memoryDocuments.delete(documentId)
  },

  // === EXTRACTED DATA METHODS ===
  async createOrUpdateExtractedData({
    documentId,
    sessionId,
    documentType,
    rawText,
    fields,
    uncertainties = [],
    isUnreadable = false,
  }) {
    if (isDbConnected()) {
      const query = {
        $or: [
          { documentIdStr: documentId },
          ...(documentId.match(/^[0-9a-fA-F]{24}$/) ? [{ documentId }] : []),
        ],
      }
      const update = {
        documentIdStr: documentId,
        ...(documentId.match(/^[0-9a-fA-F]{24}$/) ? { documentId } : {}),
        sessionId,
        documentType,
        rawText,
        fields,
        uncertainties,
        isUnreadable,
        extractedAt: new Date(),
        updatedAt: new Date(),
      }
      const doc = await ExtractedDataModel.findOneAndUpdate(query, update, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      })
      return doc.toObject ? doc.toObject() : doc
    }

    const data = {
      _id: uuidv4(),
      documentId,
      documentIdStr: documentId,
      sessionId,
      documentType,
      rawText,
      fields,
      uncertainties,
      isUnreadable,
      extractedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    memoryExtractedData.set(documentId, data)
    return data
  },

  async findExtractedDataByDocument(documentId) {
    if (isDbConnected()) {
      const query = {
        $or: [
          { documentIdStr: documentId },
          ...(documentId.match(/^[0-9a-fA-F]{24}$/) ? [{ documentId }] : []),
        ],
      }
      const doc = await ExtractedDataModel.findOne(query)
      return doc ? (doc.toObject ? doc.toObject() : doc) : null
    }

    return memoryExtractedData.get(documentId) || null
  },

  async updateExtractedFields(documentId, updatedFields = []) {
    const existing = await this.findExtractedDataByDocument(documentId)
    if (!existing) return null

    const currentFields = existing.fields || []
    const updatedMap = new Map(updatedFields.map((f) => [f.id, f]))

    const mergedFields = currentFields.map((field) => {
      if (updatedMap.has(field.id)) {
        const update = updatedMap.get(field.id)
        return {
          ...field,
          value: update.value,
          unit: update.unit !== undefined ? update.unit : field.unit,
          isUserCorrected: true,
          originalValue: field.originalValue || field.value,
        }
      }
      return field
    })

    if (isDbConnected()) {
      const query = {
        $or: [
          { documentIdStr: documentId },
          ...(documentId.match(/^[0-9a-fA-F]{24}$/) ? [{ documentId }] : []),
        ],
      }
      const doc = await ExtractedDataModel.findOneAndUpdate(
        query,
        { fields: mergedFields, updatedAt: new Date() },
        { new: true }
      )
      return doc ? (doc.toObject ? doc.toObject() : doc) : null
    }

    existing.fields = mergedFields
    existing.updatedAt = new Date()
    memoryExtractedData.set(documentId, existing)
    return existing
  },

  // === ANALYSIS METHODS (PHASE 4) ===
  async createOrUpdateAnalysis({
    documentId,
    sessionId,
    language = 'en',
    documentType,
    summary,
    extractedFacts,
    medicalTerms,
    uncertainties = [],
    safetyFlags = [],
  }) {
    if (isDbConnected()) {
      const query = {
        language,
        $or: [
          { documentIdStr: documentId },
          ...(documentId.match(/^[0-9a-fA-F]{24}$/) ? [{ documentId }] : []),
        ],
      }
      const update = {
        documentIdStr: documentId,
        ...(documentId.match(/^[0-9a-fA-F]{24}$/) ? { documentId } : {}),
        sessionId,
        language,
        documentType,
        summary,
        extractedFacts,
        medicalTerms,
        uncertainties,
        safetyFlags,
        generatedAt: new Date(),
        updatedAt: new Date(),
      }
      const doc = await AnalysisModel.findOneAndUpdate(query, update, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      })
      return doc.toObject ? doc.toObject() : doc
    }

    const key = `${documentId}_${language}`
    const analysis = {
      _id: uuidv4(),
      documentId,
      documentIdStr: documentId,
      sessionId,
      language,
      documentType,
      summary,
      extractedFacts,
      medicalTerms,
      uncertainties,
      safetyFlags,
      generatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    memoryAnalyses.set(key, analysis)
    // Also save under bare documentId for language-agnostic lookup fallback
    memoryAnalyses.set(documentId, analysis)
    return analysis
  },

  async findAnalysisByDocument(documentId, language) {
    if (isDbConnected()) {
      const query = {
        $or: [
          { documentIdStr: documentId },
          ...(documentId.match(/^[0-9a-fA-F]{24}$/) ? [{ documentId }] : []),
        ],
        ...(language ? { language } : {}),
      }
      const doc = await AnalysisModel.findOne(query).sort({ updatedAt: -1 })
      return doc ? (doc.toObject ? doc.toObject() : doc) : null
    }

    if (language) {
      const key = `${documentId}_${language}`
      if (memoryAnalyses.has(key)) return memoryAnalyses.get(key)
    }
    return memoryAnalyses.get(documentId) || null
  },

  clearMemory() {
    memoryConsents.clear()
    memoryDocuments.clear()
    memoryExtractedData.clear()
    memoryAnalyses.clear()
  },
}
