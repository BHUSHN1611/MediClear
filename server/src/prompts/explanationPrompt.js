/**
 * Plain-Language Explanation Prompts
 * 
 * STRICT CLINICAL & EXPLANATION DIRECTIVES:
 * 1. Base the explanation STRICTLY on the reviewed extracted parameters.
 * 2. Distinctly separate extracted document facts from general educational glossary terms.
 * 3. NEVER diagnose the patient with a condition (e.g. say "Your fasting blood sugar was 118 mg/dL, which is slightly above the standard range of 70-99", NOT "You have diabetes").
 * 4. NEVER suggest starting, stopping, increasing, or replacing medications.
 * 5. Explain in simple, 6th-to-8th grade plain language without medical jargon where possible.
 * 6. For Hindi ('hi'), use authentic and natural Devanagari Hindi, not transliteration or Hinglish.
 * 7. Highlight any uncertainties or unreadable items so the patient knows to verify them with their physician.
 */

export const EXPLANATION_SYSTEM_PROMPT = `You are MediClear, an educational plain-language medical document assistant.
Your goal is to help patients understand what their medical report says in accessible language.

CRITICAL MEDICAL SAFETY BOUNDARIES:
- You are NOT a doctor and must NEVER diagnose the patient.
- NEVER suggest starting, altering, or stopping medications.
- Clearly separate:
  (1) "Extracted Facts" directly observed in the document.
  (2) "Educational Terms" defining what medical words mean in everyday language.
- If a value is missing, smudged, or uncertain, state that clearly instead of assuming or filling it in.
- Always remind the user that laboratory ranges vary by provider and must be interpreted by their doctor.
- Return strictly valid JSON matching the requested schema.`

export function buildExplanationUserPrompt({
  documentType = 'lab_report',
  fields = [],
  uncertainties = [],
  language = 'en',
}) {
  const fieldsJson = JSON.stringify(fields, null, 2)
  const uncertaintiesJson = JSON.stringify(uncertainties, null, 2)

  const langInstruction =
    language === 'hi'
      ? 'Explain in clear, natural Hindi using Devanagari script (हिन्दी). Ensure medical terms have accessible Hindi explanations.'
      : 'Explain in clear, plain English suitable for patients without medical backgrounds.'

  return `Generate a plain-language explanation for this verified medical document.
Target Language: ${language === 'hi' ? 'Hindi (Devanagari)' : 'English'}
${langInstruction}

Document Type: ${documentType}

Extracted Clinical Parameters (Verified by patient):
${fieldsJson}

Document Uncertainties & Unreadable Areas:
${uncertaintiesJson}

Required JSON format:
{
  "documentType": "${documentType}",
  "language": "${language}",
  "summary": [
    "2 to 4 clear bullet sentences summarizing the overall document scope in plain words without diagnosing"
  ],
  "extractedFacts": [
    {
      "label": "Biomarker or instruction name",
      "value": "Exact measured value or instruction",
      "unit": "Unit if present",
      "source": "document"
    }
  ],
  "medicalTerms": [
    {
      "term": "Medical term used in this report",
      "simpleExplanation": "Plain language explanation of what this test or term means",
      "source": "educational_glossary"
    }
  ],
  "uncertainties": [
    "Any items that were flagged as smudged, uncertain, or requiring doctor verification"
  ],
  "safetyFlags": []
}`
}
