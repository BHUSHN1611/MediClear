import { GoogleGenAI } from '@google/genai'
import { config } from './env.js'

let aiClient = null
let mockClient = null

export function setMockGeminiClient(client) {
  mockClient = client
}

export function resetMockGeminiClient() {
  mockClient = null
  aiClient = null
}

export function getGeminiClient() {
  if (mockClient) {
    return mockClient
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey })
  }
  return aiClient
}

export function isGeminiConfigured() {
  if (mockClient) return true
  const apiKey = process.env.GEMINI_API_KEY
  return !!apiKey && apiKey !== 'your_gemini_api_key_here'
}

const DEPRECATED_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.5-flash-lite',
])

export function getGeminiModel() {
  const model = process.env.GEMINI_MODEL?.trim()
  if (!model || DEPRECATED_MODELS.has(model)) {
    return 'gemini-flash-lite-latest'
  }
  return model
}

export const GEMINI_MODEL = getGeminiModel()

export function getCandidateModels() {
  const primary = getGeminiModel()
  return [primary, 'gemini-flash-lite-latest', 'gemini-3.8-flash', 'gemini-flash-latest']
    .filter((v, i, a) => v && a.indexOf(v) === i)
}

