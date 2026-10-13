import { GoogleGenAI } from '@google/genai'
import { config } from './env.js'

let aiClient = null

export function getGeminiClient() {
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
  const apiKey = process.env.GEMINI_API_KEY
  return !!apiKey && apiKey !== 'your_gemini_api_key_here'
}

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
