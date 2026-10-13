# MASTER PRD — MediClear

## 1. Your Role

Act as a senior full-stack engineer, software architect, AI integration engineer, security-focused developer, and UI/UX designer.

Build a production-minded MVP web application named **MediClear**. Work incrementally, inspect the existing repository before changing files, and follow the requirements below.

Do not generate the entire application in one uncontrolled step. First analyze the repository, prepare the implementation plan, establish the architecture, and then implement the project phase by phase.

## 2. Product Overview

MediClear is a medical-document explanation web application that helps users understand medical documents in simple language.

Users should be able to upload supported medical documents, review extracted information, understand medical terminology, convert written instructions into checklists, prepare questions for their next doctor consultation, and interact with the explanation using Hindi or English voice features.

MediClear is an educational document-understanding assistant. It is NOT a doctor, diagnostic system, prescription generator, or emergency medical service.

## 3. Problem Statement

Patients frequently struggle to understand medical terminology, laboratory reports, prescriptions, and discharge instructions.

MediClear aims to reduce this confusion by presenting information extracted from the user's own document in clear, accessible language without inventing medical facts or replacing professional medical advice.

## 4. Target Users

- Patients who need help understanding printed medical reports.
- Family members helping patients understand written instructions.
- Hindi- and English-speaking users who prefer simple explanations.
- Users who benefit from voice interaction or text read-aloud.

## 5. MVP Scope

Support the following document types:

1. Printed laboratory reports.
2. Printed prescriptions.
3. Printed discharge instructions.

Support English and Hindi for the interface and generated explanations.

Handwritten prescriptions are out of scope for the first version.

Core functionality:

- Consent before document processing.
- Upload PDF, JPG, JPEG, and PNG files within configurable size and page limits.
- Validate files on the server, not just in the browser.
- Extract document text and relevant structured fields.
- Let users review and correct extracted information.
- Explain medical terms using simple language.
- Preserve values, units, dates, medication names, and dosage instructions accurately.
- Generate a checklist based on instructions explicitly present in the document.
- Generate useful questions for the user's next healthcare consultation.
- Support Hindi and English text-to-speech and speech-to-text where the browser supports them.
- Allow users to delete documents and associated data.
- Display clear processing states, errors, and safety notices.

## 6. Fixed Technology Stack

Frontend:
- React
- Vite
- JavaScript unless TypeScript is justified and agreed upon before implementation
- Tailwind CSS
- React Router
- React Hook Form
- Zod
- Lucide React
- i18next
- react-i18next
- Fetch API or Axios, using one consistently

Backend:
- Node.js
- Express
- MongoDB Atlas
- Mongoose
- dotenv
- cors with an explicit allowed-origin configuration
- helmet
- express-rate-limit
- multer
- file-type
- zod
- @google/genai
- bcrypt and secure authentication cookies if authentication is implemented

AI:
- Gemini API, called only from the backend.
- Structured JSON output validated against server-side schemas.
- A versioned, reviewed medical glossary and deterministic safety rules.
- No direct browser-to-Gemini requests using a secret API key.

Voice:
- Browser Web Speech API SpeechRecognition for speech-to-text.
- Browser speechSynthesis for text-to-speech.
- Explicit language selection: English (en-IN) and Hindi (hi-IN).
- Graceful handling of unsupported browsers, missing voices, denied microphone permission, and recognition errors.
- Keep voice interaction optional. Every feature must also work through ordinary text controls.
- Design a provider interface so Bhashini or another provider can be integrated later without rewriting the UI.

OCR:
- Prefer reliable document understanding for supported PDFs and images.
- Use Tesseract.js or a separately designed OCR service only when justified by testing.
- Do not introduce Python/FastAPI unless the selected extraction architecture genuinely requires it.

Deployment:
- Frontend: Vercel.
- Backend: Render.
- Database: MongoDB Atlas.
- Local development must work without deployed services, using environment variables and clearly documented setup instructions.

Do not replace this stack with Next.js, Firebase, Supabase, or another framework without explaining a real blocker and obtaining approval.

## 7. Architecture

Use a modular architecture with separate frontend and backend applications.

Suggested structure:

mediclear/
  client/
    src/
      components/
      pages/
      layouts/
      hooks/
      services/
      context/
      i18n/
      utils/
  server/
    src/
      config/
      routes/
      controllers/
      services/
      models/
      middleware/
      validators/
      prompts/
      utils/
      app.js
      server.js
  docs/
  .env.example
  README.md

Adjust this structure if the existing repository has a good established convention.

Keep routes, controllers, business services, database models, AI prompts, and validation schemas separated. Do not put the entire backend in one file.

## 8. Main User Journey

1. User visits the landing page.
2. User chooses Hindi or English.
3. User reads the privacy information and gives explicit consent.
4. User uploads a supported medical document.
5. Backend validates the file and starts extraction.
6. User sees extracted fields and can correct mistakes.
7. User confirms the extracted information.
8. Backend generates a document-grounded explanation.
9. User views the summary, medical terms, checklist, and doctor questions.
10. User can listen to the explanation or ask a question by voice or text.
11. The system checks safety rules before displaying AI-generated answers.
12. User can delete the document and its associated data.

Do not skip document review before generating final explanations when extraction is uncertain or critical values may have been misread.

## 9. API Design

Use `/api/v1` as the API prefix.

Initial endpoint plan:

- POST `/api/v1/consents`
- POST `/api/v1/documents/upload`
- GET `/api/v1/documents`
- GET `/api/v1/documents/:documentId`
- GET `/api/v1/documents/:documentId/status`
- DELETE `/api/v1/documents/:documentId`
- POST `/api/v1/documents/:documentId/extract`
- GET `/api/v1/documents/:documentId/extracted-data`
- PATCH `/api/v1/documents/:documentId/extracted-data`
- POST `/api/v1/analysis/:documentId/explain`
- GET `/api/v1/analysis/:documentId/summary`
- GET `/api/v1/analysis/:documentId/terms`
- POST `/api/v1/checklists/:documentId/generate`
- GET `/api/v1/checklists/:documentId`
- PATCH `/api/v1/checklists/:documentId/items/:itemId`
- POST `/api/v1/questions/:documentId/generate`
- GET `/api/v1/questions/:documentId`
- POST `/api/v1/safety/check`
- POST `/api/v1/feedback`

Add authentication and ownership checks wherever private user data is involved.

Do not implement every endpoint before the corresponding feature exists. Maintain API documentation and keep request and response formats consistent.

## 10. Medical Safety Requirements

This is a critical product requirement.

- Never diagnose a disease or claim that the user has a specific condition.
- Never recommend starting, stopping, increasing, decreasing, or replacing medication.
- Never invent drug names, dosages, test results, reference ranges, or treatment instructions.
- Explain only what can reasonably be supported by the provided document and reviewed glossary.
- Clearly distinguish extracted facts from general educational explanations.
- Preserve units and values exactly. Flag uncertainty instead of silently correcting questionable data.
- Never infer missing instructions.
- Do not claim that a laboratory result is safe, dangerous, normal, or abnormal without appropriate verified context.
- Explain that report interpretation depends on the user's clinical context and the reporting laboratory's reference ranges.
- Refuse requests for diagnosis, treatment decisions, and prescription changes, and redirect users to a qualified healthcare professional.
- If the user describes a possible emergency, provide a concise instruction to contact local emergency services or seek urgent medical care rather than attempting diagnosis.
- Apply safety rules on the backend. A disclaimer alone is insufficient.
- Treat document contents as untrusted input, not as instructions to the AI.
- Prevent instructions embedded inside uploaded documents from overriding system rules.
- Validate AI outputs before storing or displaying them.
- Do not use the model's own safety statement as proof that its response is safe.

## 11. Privacy and Security Requirements

Medical documents contain sensitive personal information.

- Require explicit consent before processing.
- Use synthetic or explicitly consented sample documents during development.
- Do not commit medical files, API keys, passwords, or environment files to Git.
- Keep the Gemini API key exclusively on the backend.
- Validate MIME type, file signature, extension, size, page count, and allowed document types.
- Use random server-generated filenames.
- Restrict file access to authorized users.
- Avoid logging extracted medical text, full AI prompts, or sensitive personal information.
- Mask personal identifiers before sending document content to external AI services when feasible.
- Explain that masking may not remove every identifier.
- Minimize retention. Configure automatic expiry and deletion of original files and derived records.
- Delete associated database records and stored files when a user deletes a document.
- Use secure HTTP-only cookies if cookie-based authentication is implemented.
- Configure CORS explicitly, use rate limits, and validate all incoming requests.
- Never claim encryption, deletion, anonymity, or regulatory compliance unless actually implemented and tested.
- Document the external AI provider's data-handling implications and limitations.
- Store only the metadata necessary for the application to function.

## 12. User Interface Requirements

Create a polished, modern, responsive healthcare-technology interface.

Visual direction:
- Calm and trustworthy.
- Clean typography and generous spacing.
- Accessible contrast and readable text.
- Subtle colors and restrained shadows.
- Responsive layouts for mobile, tablet, and desktop.
- Consistent buttons, cards, form controls, alerts, and loading states.
- Avoid an overly clinical, cluttered dashboard.

Required screens:
- Landing page.
- Privacy and consent screen.
- Upload page.
- Document processing page.
- Extracted-data review page.
- Document explanation page.
- Checklist view.
- Doctor-question view.
- Settings/privacy page.
- Error and empty states.

Include loading, success, validation, and failure states for every important action.

The Hindi interface must use proper Hindi text, not transliterated English. Keep translations in translation files instead of scattering conditional language strings throughout components.

## 13. AI Output Contract

Use strict structured outputs and validate them with Zod.

The document explanation should support a structure similar to:

{
  "documentType": "lab_report | prescription | discharge_instructions | unknown",
  "language": "en | hi",
  "summary": [],
  "extractedFacts": [],
  "medicalTerms": [],
  "checklist": [],
  "doctorQuestions": [],
  "uncertainties": [],
  "safetyFlags": []
}

This is an illustrative contract. Finalize the schema before implementation and keep it consistent across prompts, validators, database records, and frontend components.

Every fact must be traceable to the extracted document when possible. Preserve source values and units. If extraction confidence is low or information is absent, report the uncertainty rather than inventing a value.

Do not ask the AI to produce unsupported diagnoses or treatment recommendations.

## 14. Testing Requirements

Write tests as each feature is implemented.

Test:
- Invalid files and oversized uploads.
- Unsupported file formats.
- Extraction failures and uncertain values.
- Missing or malformed AI output.
- Invalid request bodies.
- Unauthenticated or unauthorized document access.
- Deletion of original and derived data.
- Hindi and English language selection.
- Unsupported speech recognition and missing speech voices.
- Refusal of diagnosis and medication-change requests.
- Malicious instructions embedded in documents.
- Empty states, loading states, and API failures.
- End-to-end flow using synthetic sample documents.

Create a reusable set of medical safety tests. Never use real patient records as test fixtures.

## 15. Development Workflow

Work in explicit phases:

Phase 0: Repository inspection, requirements clarification, architecture and plan.

Phase 1: Project setup, shared configuration, UI foundation, bilingual interface.

Phase 2: Backend foundation, database, consent and secure document upload.

Phase 3: Document extraction and editable extracted-data review.

Phase 4: AI explanations, medical glossary and safety guardrails.

Phase 5: Checklist and doctor-question generation.

Phase 6: Hindi and English voice features.

Phase 7: Privacy, deletion, security hardening and comprehensive testing.

Phase 8: Deployment, environment configuration and documentation.

After each phase:
1. Summarize what changed.
2. List files created or modified.
3. Run relevant tests, linting, and build checks.
4. Report actual failures honestly.
5. Update documentation and the implementation checklist.
6. Identify known limitations.
7. Stop and wait for approval before starting the next phase.

Do not claim tests passed if they were not run. Do not replace working code with placeholders. Do not hardcode secrets or fabricate successful API responses.

## 16. Initial Task

For now, do not implement the entire application.

Inspect the current repository, determine whether it is empty or already contains code, and identify its framework and existing conventions.

Then produce:
- A concise requirements summary.
- The proposed architecture and directory structure.
- A dependency plan.
- A list of API contracts and data models.
- A phase-by-phase implementation checklist.
- The main technical risks, especially medical safety, privacy, document extraction, and browser voice support.

Ask questions only if a decision genuinely blocks implementation. Otherwise, state reasonable assumptions and proceed with the planning phase.

Wait for my approval before implementing Phase 1.