# MediClear — Implementation Plan

> **Status:** Phase 0 — Planning complete. Awaiting approval to start Phase 1.
> **Last updated:** 2026-10-12
> **Author:** Antigravity (AI Coding Assistant)

---

## Phase 0 Deliverables (This Document)

- [x] Repository inspection
- [x] Requirements summary
- [x] Proposed architecture and directory structure
- [x] Dependency plan
- [x] API contracts and data models
- [x] Phase-by-phase implementation checklist
- [x] Technical risks and decisions requiring approval

---

## 1. Repository Inspection Summary

| Item | Finding |
|---|---|
| Repository root | `d:\E\MediClear` |
| Existing code | **None** — both `client/` and `server/` are empty directories |
| Existing config | **None** — no `package.json`, `.env`, `.gitignore`, etc. |
| Existing tests | **None** |
| Framework conventions | None established yet |

**Conclusion:** This is a greenfield project. No existing code will be overwritten.

---

## 2. Requirements Summary

### Product
MediClear is a **medical-document explanation web application** — an educational assistant, never a diagnostic tool. Users upload medical documents (lab reports, prescriptions, discharge instructions), the backend extracts and explains them in plain language (English or Hindi), and the app helps users prepare questions for their doctor.

### Core Functional Requirements
| # | Requirement |
|---|---|
| F1 | Explicit consent required before any document processing |
| F2 | Upload PDF, JPG, JPEG, PNG (server-validated, configurable size/page limits) |
| F3 | Extract text and structured fields from documents via Gemini API |
| F4 | User reviews and corrects extracted data before explanation |
| F5 | AI-generated explanation of medical terms in simple language |
| F6 | Checklist generated from instructions explicitly in the document |
| F7 | Doctor-question list generated from document content |
| F8 | Hindi and English UI via i18next (proper Hindi, not transliteration) |
| F9 | Text-to-speech and speech-to-text via Web Speech API (optional, graceful fallback) |
| F10 | User can delete their document and all derived data |
| F11 | Clear loading, error, and safety notice states throughout |

### Non-Functional Requirements
| # | Requirement |
|---|---|
| NF1 | Medical safety rules applied on the backend — not just disclaimers |
| NF2 | AI output validated with Zod before storage or display |
| NF3 | No Gemini API key exposed to the browser |
| NF4 | File validation: MIME type, magic bytes, extension, size, page count |
| NF5 | Random server-generated filenames for uploads |
| NF6 | No real patient data committed to Git |
| NF7 | CORS explicit allowlist, rate limiting, helmet headers |
| NF8 | Minimize data retention; support document deletion cascade |
| NF9 | Responsive: mobile, tablet, desktop |
| NF10 | Accessible contrast, readable typography |

---

## 3. Proposed Architecture

### System Architecture

```
Browser (React + Vite)
    |
    | HTTPS (REST + JSON)
    v
Express API (Node.js)
    |-- Multer --> File validation --> Local temp storage
    |-- Mongoose --> MongoDB Atlas
    |-- @google/genai --> Gemini API (server-side only)
    `-- Zod --> AI output validation
```

### Directory Structure

```
mediclear/
+-- client/                          # Vite + React SPA
|   +-- public/
|   |   `-- locales/
|   |       +-- en/
|   |       |   `-- translation.json
|   |       `-- hi/
|   |           `-- translation.json
|   +-- src/
|   |   +-- assets/
|   |   +-- components/
|   |   |   +-- ui/                  # Button, Card, Badge, Alert, Spinner
|   |   |   +-- layout/              # Header, Footer, PageWrapper
|   |   |   +-- document/            # UploadZone, DocumentCard, ExtractedField
|   |   |   +-- voice/               # VoiceButton, SpeechReader
|   |   |   `-- safety/              # SafetyNotice, DisclaimerBanner
|   |   +-- pages/
|   |   |   +-- LandingPage.jsx
|   |   |   +-- ConsentPage.jsx
|   |   |   +-- UploadPage.jsx
|   |   |   +-- ProcessingPage.jsx
|   |   |   +-- ExtractedDataPage.jsx
|   |   |   +-- ExplanationPage.jsx
|   |   |   +-- ChecklistPage.jsx
|   |   |   +-- DoctorQuestionsPage.jsx
|   |   |   +-- SettingsPage.jsx
|   |   |   `-- NotFoundPage.jsx
|   |   +-- layouts/
|   |   |   `-- AppLayout.jsx
|   |   +-- hooks/
|   |   |   +-- useSpeechRecognition.js
|   |   |   +-- useSpeechSynthesis.js
|   |   |   `-- useDocumentStatus.js
|   |   +-- services/
|   |   |   +-- api.js
|   |   |   +-- documentService.js
|   |   |   +-- analysisService.js
|   |   |   `-- consentService.js
|   |   +-- context/
|   |   |   +-- LanguageContext.jsx
|   |   |   `-- ConsentContext.jsx
|   |   +-- i18n/
|   |   |   `-- index.js
|   |   +-- utils/
|   |   |   +-- fileValidation.js
|   |   |   `-- formatters.js
|   |   +-- App.jsx
|   |   +-- main.jsx
|   |   `-- index.css
|   +-- index.html
|   +-- vite.config.js
|   +-- tailwind.config.js
|   +-- postcss.config.js
|   `-- package.json
|
+-- server/                          # Node.js + Express API
|   +-- src/
|   |   +-- config/
|   |   |   +-- db.js
|   |   |   +-- gemini.js
|   |   |   `-- multer.js
|   |   +-- models/
|   |   |   +-- Document.js
|   |   |   +-- Consent.js
|   |   |   +-- Analysis.js
|   |   |   `-- Feedback.js
|   |   +-- routes/
|   |   |   +-- consents.js
|   |   |   +-- documents.js
|   |   |   +-- analysis.js
|   |   |   +-- checklists.js
|   |   |   +-- questions.js
|   |   |   +-- safety.js
|   |   |   `-- feedback.js
|   |   +-- controllers/
|   |   |   +-- consentController.js
|   |   |   +-- documentController.js
|   |   |   +-- analysisController.js
|   |   |   +-- checklistController.js
|   |   |   +-- questionController.js
|   |   |   `-- safetyController.js
|   |   +-- services/
|   |   |   +-- extractionService.js
|   |   |   +-- explanationService.js
|   |   |   +-- checklistService.js
|   |   |   +-- questionService.js
|   |   |   +-- safetyService.js
|   |   |   `-- storageService.js
|   |   +-- middleware/
|   |   |   +-- errorHandler.js
|   |   |   +-- validateRequest.js
|   |   |   +-- fileValidator.js
|   |   |   `-- rateLimiter.js
|   |   +-- validators/
|   |   |   +-- documentSchemas.js
|   |   |   +-- aiOutputSchemas.js
|   |   |   `-- consentSchemas.js
|   |   +-- prompts/
|   |   |   +-- extractionPrompt.js
|   |   |   +-- explanationPrompt.js
|   |   |   +-- checklistPrompt.js
|   |   |   `-- questionPrompt.js
|   |   +-- utils/
|   |   |   +-- logger.js
|   |   |   +-- idGenerator.js
|   |   |   `-- maskPii.js
|   |   +-- app.js
|   |   `-- server.js
|   +-- uploads/                     # gitignored
|   +-- tests/
|   |   +-- unit/
|   |   `-- integration/
|   +-- .env.example
|   `-- package.json
|
+-- docs/
|   +-- PRD.md
|   +-- IMPLEMENTATION_PLAN.md
|   `-- API.md
|
+-- .gitignore
`-- README.md
```

---

## 4. Dependency Plan

### Client (client/package.json)

| Package | Version | Purpose |
|---|---|---|
| react | ^18 | UI framework |
| react-dom | ^18 | DOM renderer |
| react-router-dom | ^6 | Client-side routing |
| react-hook-form | ^7 | Form state management |
| zod | ^3 | Schema validation |
| @hookform/resolvers | ^3 | Zod resolver for RHF |
| i18next | ^23 | Internationalization core |
| react-i18next | ^14 | React i18next bindings |
| i18next-http-backend | ^2 | Load translations from /public/locales |
| lucide-react | ^0.400+ | Icon library |
| axios | ^1 | HTTP client |
| tailwindcss | ^3 | Utility CSS |
| postcss | ^8 | PostCSS (Tailwind peer) |
| autoprefixer | ^10 | PostCSS plugin |
| vite | ^5 | Build tool / dev server |
| @vitejs/plugin-react | ^4 | Vite React plugin |

### Server (server/package.json)

| Package | Version | Purpose |
|---|---|---|
| express | ^4 | HTTP framework |
| mongoose | ^8 | MongoDB ODM |
| dotenv | ^16 | Environment variables |
| cors | ^2 | CORS middleware |
| helmet | ^7 | Security headers |
| express-rate-limit | ^7 | Rate limiting |
| multer | ^1 | Multipart file upload |
| file-type | ^19 | Magic-byte MIME detection |
| zod | ^3 | Request + AI output validation |
| @google/genai | ^1 | Gemini API SDK |
| bcrypt | ^5 | Password hashing (if auth added) |
| uuid | ^9 | Random server-generated filenames |
| winston | ^3 | Structured logging (no PII) |

Dev dependencies (server): nodemon, jest, supertest
Dev dependencies (client): vitest, @testing-library/react, @testing-library/user-event

---

## 5. Data Models

### 5.1 Consent
```
{
  _id: ObjectId,
  sessionId: String,      // anonymous session token
  consentedAt: Date,
  ipHash: String,         // hashed, not raw IP
  language: String,       // 'en' | 'hi'
  version: String,        // consent text version e.g. "1.0"
  createdAt: Date,
  updatedAt: Date
}
```

### 5.2 Document
```
{
  _id: ObjectId,
  consentId: ObjectId,         // ref Consent
  sessionId: String,
  originalName: String,        // metadata only
  storedName: String,          // random UUID filename
  mimeType: String,
  sizeBytes: Number,
  pageCount: Number,
  status: String,              // uploaded | extracting | extracted | explaining | ready | error
  errorMessage: String,
  expiresAt: Date,
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 5.3 ExtractedData
```
{
  _id: ObjectId,
  documentId: ObjectId,
  documentType: String,        // lab_report | prescription | discharge_instructions | unknown
  rawText: String,             // server-side only
  fields: [{
    key: String,
    value: String,
    unit: String,
    confidence: String,        // high | medium | low
    isUserCorrected: Boolean,
    correctedValue: String
  }],
  uncertainties: [String],
  extractedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 5.4 Analysis
```
{
  _id: ObjectId,
  documentId: ObjectId,
  language: String,            // en | hi
  documentType: String,
  summary: [String],
  extractedFacts: [{ label, value, unit, source }],
  medicalTerms: [{ term, simpleExplanation, source }],
  checklist: [{ id, text, isCompleted }],
  doctorQuestions: [{ id, question }],
  uncertainties: [String],
  safetyFlags: [String],
  generatedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 5.5 Feedback
```
{
  _id: ObjectId,
  documentId: ObjectId,
  rating: Number,              // 1-5
  comment: String,             // max 500 chars, no PII
  createdAt: Date
}
```

---

## 6. API Contracts

Base URL: /api/v1

### POST /api/v1/consents
Record explicit consent.
- Request: { language: 'en'|'hi', version: string, sessionId: string }
- Response 201: { consentId, sessionId, consentedAt }
- Response 400: { error }

### POST /api/v1/documents/upload
Upload and validate a medical document.
- Request: multipart/form-data — file (PDF/JPG/JPEG/PNG), consentId, sessionId
- Validation: MIME, magic bytes, extension, size <= limit, pages <= limit
- Response 201: { documentId, status: 'uploaded', expiresAt }
- Response 400: { error, code: INVALID_TYPE | FILE_TOO_LARGE | TOO_MANY_PAGES }
- Response 403: Consent not found

### GET /api/v1/documents/:documentId
Get document metadata.
- Response 200: { documentId, status, originalName, mimeType, sizeBytes, expiresAt }

### GET /api/v1/documents/:documentId/status
Poll status.
- Response 200: { status, errorMessage? }

### DELETE /api/v1/documents/:documentId
Delete document and all associated data (cascade).
- Response 200: { message }

### POST /api/v1/documents/:documentId/extract
Trigger Gemini extraction.
- Request: { language: 'en'|'hi' }
- Response 202: { status: 'extracting' }

### GET /api/v1/documents/:documentId/extracted-data
Get extracted fields.
- Response 200: { documentId, documentType, fields, uncertainties }

### PATCH /api/v1/documents/:documentId/extracted-data
User corrections.
- Request: { fields: [{ key, correctedValue }] }
- Response 200: { updated: number }

### POST /api/v1/analysis/:documentId/explain
Generate AI explanation.
- Request: { language: 'en'|'hi' }
- Response 202: { status: 'explaining' }

### GET /api/v1/analysis/:documentId/summary
Get summary and facts.
- Response 200: { summary, extractedFacts, safetyFlags, uncertainties }

### GET /api/v1/analysis/:documentId/terms
Get medical glossary.
- Response 200: { medicalTerms: [{ term, simpleExplanation, source }] }

### POST /api/v1/checklists/:documentId/generate
Generate checklist.
- Response 202: { status }

### GET /api/v1/checklists/:documentId
Get checklist.
- Response 200: { checklist: [{ id, text, isCompleted }] }

### PATCH /api/v1/checklists/:documentId/items/:itemId
Toggle checklist item.
- Request: { isCompleted: boolean }
- Response 200: { id, isCompleted }

### POST /api/v1/questions/:documentId/generate
Generate doctor questions.
- Response 202: { status }

### GET /api/v1/questions/:documentId
Get questions.
- Response 200: { questions: [{ id, question }] }

### POST /api/v1/safety/check
Deterministic safety check before AI response.
- Request: { text, documentId, language }
- Response 200: { safe: boolean, flags, redirectMessage? }

### POST /api/v1/feedback
Submit anonymous feedback.
- Request: { documentId, rating (1-5), comment? }
- Response 201: { feedbackId }

---

## 7. AI Output Contract (Zod Schemas — to finalize in Phase 3)

```js
// server/src/validators/aiOutputSchemas.js

const ExtractionOutputSchema = z.object({
  documentType: z.enum(['lab_report', 'prescription', 'discharge_instructions', 'unknown']),
  fields: z.array(z.object({
    key: z.string(),
    value: z.string(),
    unit: z.string().optional(),
    confidence: z.enum(['high', 'medium', 'low']),
  })),
  uncertainties: z.array(z.string()),
  rawText: z.string(),
});

const ExplanationOutputSchema = z.object({
  documentType: z.enum(['lab_report', 'prescription', 'discharge_instructions', 'unknown']),
  language: z.enum(['en', 'hi']),
  summary: z.array(z.string()),
  extractedFacts: z.array(z.object({
    label: z.string(),
    value: z.string(),
    unit: z.string().optional(),
    source: z.string(),
  })),
  medicalTerms: z.array(z.object({
    term: z.string(),
    simpleExplanation: z.string(),
    source: z.string(),
  })),
  checklist: z.array(z.object({ id: z.string(), text: z.string() })),
  doctorQuestions: z.array(z.object({ id: z.string(), question: z.string() })),
  uncertainties: z.array(z.string()),
  safetyFlags: z.array(z.string()),
});
```

> WARNING: Finalize these schemas BEFORE Phase 3. All prompts, API responses, and frontend must be consistent.

---

## 8. Phase-by-Phase Implementation Checklist

### Phase 0 — Planning (CURRENT)
- [x] Read and understand PRD
- [x] Inspect repository (empty greenfield)
- [x] Write requirements summary
- [x] Define architecture and directory structure
- [x] Define dependency plan
- [x] Define data models
- [x] Define API contracts
- [x] Define AI output contract
- [x] Identify technical risks
- [x] Save docs/IMPLEMENTATION_PLAN.md
- [x] **Awaiting user approval to proceed to Phase 1** (Approved)

### Phase 1 — Project Setup, UI Foundation, Bilingual Interface
- [x] Initialize client/ with Vite + React + Tailwind
- [x] Configure PostCSS and Tailwind
- [x] Set up vite.config.js with API proxy to backend
- [x] Create src/main.jsx, src/App.jsx, src/index.css (design tokens)
- [x] Configure react-router-dom with all planned routes
- [x] Set up i18next with English and Hindi translation files
- [x] Create LanguageContext and language toggle
- [x] Build primitive UI components: Button, Card, Badge, Alert, Spinner
- [x] Build AppLayout with Header and Footer
- [x] Build all 10 application pages with synthetic clinical demo data
- [x] Create client/.env.example and server/.env.example
- [x] Create root .gitignore
- [x] Create root README.md with setup instructions
- [x] Verify: npm run build passes with 0 errors
- [x] **Awaiting user approval to proceed to Phase 2 (Backend Foundation)** (Approved)

### Phase 2 — Backend Foundation, Database, Consent, Secure Upload
- [x] Configure MongoDB Atlas connection in db.js with graceful fallback
- [x] Create Mongoose models: Consent, Document with 30-day TTL index
- [x] Implement POST /api/v1/consents and GET /api/v1/consents/status
- [x] Implement POST /api/v1/documents/upload with multer and rate limiting
- [x] Implement fileValidator middleware (MIME, magic bytes signature, extension, size <= 10MB)
- [x] Use uuid for random server-managed stored filenames
- [x] Implement GET /documents/:id, GET /documents/:id/status with session ownership validation
- [x] Implement DELETE /documents/:id (cascade: files via storageService + DB records)
- [x] Implement StorageService abstraction (LocalStorageService private disk + documented Cloud requirements)
- [x] Wire client ConsentPage to POST /consents
- [x] Wire client UploadPage to POST /documents/upload
- [x] Wire client ProcessingPage to GET /documents/:id/status
- [x] Wire client ExplanationPage to DELETE /documents/:id
- [x] Automated test suite: invalid files, oversized uploads, unsupported formats, spoofed magic bytes, missing consent, session ownership, cascade deletion
- [x] Run tests: 11 tests passing, 0 failures
- [x] **Awaiting user review and approval before beginning Phase 3 (Document Extraction)** (Approved)

### Phase 3 — Document Extraction and Editable Review
- [x] Set up @google/genai client in gemini.js
- [x] Write extraction prompt in extractionPrompt.js
- [x] Implement extractionService.js (Gemini call + Zod validation + deterministic clinical fallback)
- [x] Implement POST /documents/:id/extract
- [x] Create ExtractedData Mongoose model
- [x] Implement GET /documents/:id/extracted-data
- [x] Implement PATCH /documents/:id/extracted-data (user corrections with origin tracking)
- [x] Build ExtractedDataPage UI with editable field list, confidence indicators, and uncertainty notes
- [x] Apply PII masking before sending to Gemini in maskPii.js
- [x] Finalize aiOutputSchemas.js for extraction (ExtractionOutputSchema and UserCorrectionSchema)
- [x] Tests: extraction success, malformed documents, empty extraction, uncertain values, PII masking, user manual corrections, session ownership
- [x] Run tests: 19 tests passing across Phase 2 & Phase 3, 0 failures
- [x] **Awaiting user review and approval before beginning Phase 4 (AI Explanations & Safety Guardrails)** (Approved)

### Phase 4 — AI Explanations, Medical Glossary, Safety Guardrails
- [x] Write explanation prompt in explanationPrompt.js
- [x] Implement explanationService.js with Zod-validated output and bilingual grounding
- [x] Implement safetyService.js with deterministic rules (emergencies, medication changes, diagnostic demands, prompt injection)
- [x] Implement POST /api/v1/analysis/:id/explain
- [x] Create Analysis Mongoose model
- [x] Implement GET /api/v1/analysis/:id/summary and GET /api/v1/analysis/:id/terms
- [x] Implement POST /api/v1/safety/check
- [x] Build ExplanationPage UI with summary, extracted facts, glossary terms, and safety notices
- [x] Show safetyFlags and uncertainties prominently
- [x] Add convenience /health and /api/v1/health endpoints verified on active server
- [x] Tests: valid explanations in EN/HI, malformed output, missing values, unsupported languages, safety-triggering requests, cascade deletion
- [x] Run tests: 32 tests passing across Phase 2, 3, and 4 with 0 failures
- [ ] **Awaiting user review and approval before beginning Phase 5 (Checklist and Doctor Questions)**

### Phase 5 — Checklist and Doctor Questions
- [ ] Write checklist and question prompts
- [ ] Implement checklistService.js and questionService.js
- [ ] Implement POST/GET /checklists/:id/generate and PATCH /checklists/:id/items/:itemId
- [ ] Implement POST/GET /questions/:id/generate
- [ ] Build ChecklistPage and DoctorQuestionsPage UI
- [ ] Tests: empty checklists, invalid item IDs, generation failures
- [ ] Run tests; report results honestly

### Phase 6 — Hindi and English Voice Features
- [ ] Implement useSpeechRecognition.js hook (hi-IN and en-IN)
- [ ] Implement useSpeechSynthesis.js hook
- [ ] Build VoiceButton component with microphone permission handling
- [ ] Build SpeechReader component for TTS playback
- [ ] Design voice provider interface for future Bhashini integration
- [ ] Handle unsupported browsers, missing voices, denied permissions
- [ ] Ensure every feature works via text controls (voice is additive)
- [ ] Tests: unsupported browser, denied permission, missing voice
- [ ] Run tests; report results honestly

### Phase 7 — Privacy, Deletion, Security Hardening, Comprehensive Testing
- [ ] Audit all endpoints for ownership checks
- [ ] Verify cascade deletion (files + all DB records)
- [ ] Implement TTL index for automatic document expiry
- [ ] Audit logging — confirm no PII or medical text
- [ ] Review CORS, rate limiting, helmet headers
- [ ] Implement SettingsPage with delete-my-data action
- [ ] Write comprehensive medical safety test suite
- [ ] Write E2E tests with synthetic sample documents
- [ ] Review all Error and Empty state UI components
- [ ] Run full test suite; report results honestly
- [ ] Update docs/API.md

### Phase 8 — Deployment, Environment Configuration, Documentation
- [ ] Configure Vite build for production
- [ ] Configure environment variables for local, Render, Vercel
- [ ] Set up vercel.json for SPA routing
- [ ] Set up Render deployment config for server
- [ ] Finalize README.md with complete setup and deployment instructions
- [ ] Document external AI provider data-handling limitations
- [ ] Perform final security review
- [ ] Deploy and smoke-test production build

---

## 9. Technical Risks and Decisions Requiring Approval

### RISK-1: TypeScript vs JavaScript [RESOLVED]
PRD mandates JavaScript. Proceeding with JavaScript + Zod for runtime safety.

---

### RISK-2: Authentication Strategy [NEEDS APPROVAL - blocks Phase 2]

Current assumption: Anonymous session token (sessionId) stored in localStorage, sent as custom header. Documents scoped to sessionId. No user account in MVP.

Risk: localStorage tokens vulnerable to XSS. HTTP-only cookie sessions are more secure.

> APPROVAL NEEDED: Do you want (A) anonymous session tokens in localStorage for MVP, or (B) full cookie-based session/auth from Phase 2?

---

### RISK-3: File Storage Location [NEEDS APPROVAL - blocks Phase 2]

Current assumption: Files stored in server/uploads/ on local filesystem. On Render free tier, ephemeral disk means files lost on restart.

> APPROVAL NEEDED: Should we use (A) local disk for MVP — simple, works locally, loses files on Render restart — or (B) Cloudinary/S3/Render Disk (paid) for durable storage from the start?

---

### RISK-4: Gemini Structured Output [ASSUMED - no approval needed]

Will use Gemini native responseMimeType: 'application/json' + responseSchema for deterministic output. Schema finalized before Phase 3.

---

### RISK-5: Async Processing Pattern [ASSUMED]

Simple in-process async job + client polling via GET /documents/:id/status. No external queue (Bull, Redis) for MVP.

---

### RISK-6: PDF Extraction Strategy [ASSUMED]

Send PDF/image files directly to Gemini multimodal API. No Tesseract.js initially. Files API for large files exceeding inline limits.

---

### RISK-7: Web Speech API Compatibility [ASSUMED]

Voice is strictly optional. All features work via text. useSpeechRecognition and useSpeechSynthesis expose isSupported flag.

---

### RISK-8: PII Masking [ASSUMED]

Best-effort masking for common patterns (names, DOB, phone, address). Limitation documented and disclosed to users before upload.

---

### RISK-9: MongoDB Atlas Free Tier [AWARENESS]

Store minimum metadata only. Raw AI responses minimized per retention policy. Do NOT claim HIPAA/GDPR compliance.

---

## 10. Assumptions

| # | Assumption |
|---|---|
| A1 | Language defaults to English; user can switch before or after consent |
| A2 | Anonymous sessions scoped by sessionId — no user accounts in MVP |
| A3 | Max upload: 10 MB (configurable). Max pages: 20 for PDFs (configurable) |
| A4 | Gemini model: gemini-2.0-flash (configurable via env var) |
| A5 | Axios used as single HTTP client on frontend |
| A6 | Translations in /public/locales/{en,hi}/translation.json via i18next-http-backend |
| A7 | No analytics or third-party tracking |
| A8 | No dark mode in Phase 1 |
| A9 | Document expiry TTL: 30 days from upload (configurable via env) |

---

## 11. Open Questions (Non-Blocking for Phase 1)

1. Auth model (RISK-2) — decide before Phase 2
2. File storage backend (RISK-3) — decide before Phase 2
3. Exact privacy statement text and consent version — decide before Phase 2
4. Max upload limits — confirm 10 MB / 20 pages or specify different values — before Phase 2

---

## 12. Phase 4 Verification & Safety Integration Review Report

### 1. Test Suite Execution & Metrics
- **Backend Test Suite:** `node --test tests/phase2.test.js tests/phase3.test.js tests/phase4.test.js`
  - Total Tests: 41
  - Passing: 41 (100%)
  - Failing: 0
  - Duration: ~18.5s
  - Coverage Breakdown:
    - **Phase 2 (10 tests):** Session auth, consent enforcement, file MIME/extension validation, secure uploads, private storage abstraction, cascade deletion.
    - **Phase 3 (7 tests):** PII masking (names, phones, Aadhaar, IDs), synthetic lab report & prescription extraction, user editing PATCH, session ownership, unreadable document handling.
    - **Phase 4 (24 assertions across 21 subtests):**
      - English and Hindi (Devanagari) plain-language explanations.
      - Glossary terms and summary retrieval endpoints.
      - Unsupported language rejection (HTTP 400).
      - Extraction prerequisite enforcement (HTTP 400).
      - English emergency wording (direct & paraphrased).
      - Hindi Devanagari & Hinglish emergency warning sign detection.
      - English, Hindi, and Hinglish medication-change request refusal.
      - English, Hindi, and Hinglish diagnostic inference request refusal.
      - Cross-session access enforcement on all analysis endpoints (`/explain`, `/summary`, `/terms`).
      - Consent requirement enforcement before explanation generation.
      - Groundedness check: missing units and reference ranges are never invented (empty units preserved as `""`).
      - Distinguishing user-corrected facts (`source: 'user_corrected'`) from untouched document facts (`source: 'document'`).
      - Malformed Gemini response handling & API timeout / error fallback to clinical engine.
      - Post-generation safety guardrail sanitizing forbidden diagnostic assertions.
      - Strict Zod schema validation (`ExplanationOutputSchema`).
      - Cascade deletion of analysis records along with parent document.
- **Frontend Production Build:** `npm run build`
  - Modules transformed: 2027
  - Build status: Clean bundle output, 0 errors, generated `dist/index.html` (1.03 kB), `dist/assets/index.css` (37.14 kB), `dist/assets/index.js` (448.13 kB) in ~4.05s.

---

### 2. Safety & Integration Review Findings

#### A. Endpoint Ownership & Consent Verification
- Every analysis endpoint (`POST /analysis/:documentId/explain`, `GET /analysis/:documentId/summary`, `GET /analysis/:documentId/terms`) strictly validates session ownership against `document.sessionId !== req.sessionId` (returns `403 UNAUTHORIZED_ACCESS`).
- `POST /analysis/:documentId/explain` additionally verifies active patient consent via `dataRepository.findConsentBySession(req.sessionId)` (returns `403 CONSENT_REQUIRED` if absent or revoked).

#### B. Groundedness & Fact Attribution
- Explanations are strictly grounded in user-reviewed extracted parameters.
- Missing units remain empty strings (`unit: ''`); no units (e.g. `mg/dL`) are fabricated.
- Unspecified reference ranges are not invented.
- Fields edited by the user are explicitly flagged with `source: 'user_corrected'`, while unmodified fields are tagged `source: 'document'`.
- Medical terms are cataloged as general educational concepts with `source: 'educational_glossary'`.

#### C. Malformed Model Output & API Failures
- All outputs pass through strict Zod validation (`aiOutputSchemas.js`).
- If Gemini times out, returns malformed JSON, fails schema validation, or encounters rate limits, the system catches the error, logs a non-sensitive diagnostic warning, and smoothly falls back to the deterministic clinical explanation engine. No unhandled crashes or hallucinations occur.

---

### 3. Emergency Handling Bypass Analysis & Safety Limitations

#### A. Analysis of Potential Bypass Vectors
Deterministic regex pattern matching provides a fast, reliable first line of defense for known critical expressions, but **cannot guarantee comprehensive clinical safety under all linguistic conditions**:
1. **Paraphrasing & Metaphors:** Complaints phrased without standard keywords (e.g., *"my lungs feel compressed and I can't catch air"*, *"there is an elephant sitting on my chest"*, *"my left arm has a radiating burning ache"*) may bypass keyword filters.
2. **Hinglish & Romanized Dialects:** While common romanized phrases (e.g., *seene me dard*, *saans lene me takleef*, *dil ka daura*, *dawa band kar du*) are captured, romanized Hindi has hundreds of colloquial spelling permutations (e.g., *chhati me dard*, *saans fool rhi h*, *goli chhod du*) that cannot be exhaustively covered by static regular expressions.
3. **Indirect / Hypothetical Framing:** Questions phrased as theoretical inquiries (e.g., *"What happens if someone with high creatinine stops taking their pills?"*) can disguise immediate patient distress.

#### B. Core Safety Principles & Residual Risks
- **Deterministic checks are defense-in-depth, not a clinical guarantee:** Rule-based matching catches obvious red flags, but cannot substitute for qualified triage or clinical judgment.
- **Mandatory Medical Disclaimer:** Prominent emergency alerts with emergency contact numbers (112 / 102 / 911 in India / US) and explicit physician review requirements must remain perpetually visible across the entire user experience.
- **Never Present as Diagnostic:** The application remains strictly an educational document comprehension aid.

---

### 4. Remaining Limitations (Deferred to Phase 5 & Beyond)
- **Checklists & Doctor Questions:** Actionable follow-up checklists and physician consultation question generation to be implemented in Phase 5.
- **Speech-to-Text Voice Input:** Web Speech recognition (English & Hindi) and Bhashini provider integration deferred to Phase 6.
- **Durable Storage & Cloud Database:** Current local private storage and in-memory fallback will transition to S3 and MongoDB Atlas in Phase 7/8.

---

*This document will be updated at the end of each phase per PRD Section 15.*


