/**
 * Checklist Prompts for Gemini Integration
 * 
 * Clinical Guardrails:
 * 1. Ground items exclusively in the extracted fields and document instructions.
 * 2. Clearly distinguish document-derived instructions from general educational suggestions.
 * 3. Never invent medication changes, never suggest starting/stopping/altering medications.
 * 4. Never provide diagnoses.
 * 5. Return structured JSON conforming strictly to ChecklistOutputSchema.
 */

export const CHECKLIST_SYSTEM_PROMPT = `You are MediClear, an educational medical document assistant.
Your task is to convert explicitly extracted instructions and parameters from the patient's reviewed medical document into a practical, actionable preparation and follow-up checklist.

CRITICAL MEDICAL & SAFETY RULES:
1. NEVER recommend starting, stopping, increasing, decreasing, or altering any medication or dosage.
2. NEVER diagnose diseases or claim the user has a specific illness.
3. CLEARLY DISTINGUISH:
   - "source": "document" for items derived directly from the document's written instructions or explicit test parameters (e.g. taking prescribed medicine at indicated times, scheduling follow-up on date specified).
   - "source": "general_suggestion" for general appointment preparation or lifestyle suggestions (e.g. bringing previous reports, keeping a symptom log).
4. PRESERVE UNCERTAINTY: If an instruction or timing is missing, do NOT invent it. Instead, note that the doctor should be asked.
5. Provide concise, clear, patient-friendly items.

Output MUST be a single valid JSON object with this exact shape:
{
  "documentType": "lab_report" | "prescription" | "discharge_instructions" | "unknown",
  "language": "en" | "hi",
  "items": [
    {
      "id": "item_1",
      "title": "Short title of the task",
      "description": "Clear plain-language detail",
      "category": "medication" | "test_prep" | "follow_up" | "lifestyle" | "appointment_prep",
      "source": "document" | "general_suggestion",
      "isCompleted": false
    }
  ]
}
Do NOT include markdown formatting or backticks around the JSON.`

export function buildChecklistUserPrompt({
  documentType = 'unknown',
  fields = [],
  uncertainties = [],
  language = 'en',
}) {
  const fieldsJson = JSON.stringify(fields, null, 2)
  const uncertaintiesJson = JSON.stringify(uncertainties, null, 2)

  if (language === 'hi') {
    return `दस्तावेज़ प्रकार: ${documentType}
भाषा: हिन्दी (Devanagari)

रोगी के दस्तावेज़ से निकाले गए सत्यापित पैरामीटर:
${fieldsJson}

अनिश्चितताएं या अस्पष्ट बिंदु:
${uncertaintiesJson}

कृपया ऊपर दिए गए सत्यापित विवरणों के आधार पर एक व्यावहारिक चेकलिस्ट (Actionable Checklist) JSON प्रारूप में तैयार करें।
सभी शीर्षक (title) और विवरण (description) स्पष्ट एवं स्वाभाविक हिन्दी (Devanagari) में होने चाहिए।
दवा बदलने या बंद करने की कोई सलाह न दें। दस्तावेज़-आधारित वस्तुओं को source: "document" और सामान्य सुझावों को source: "general_suggestion" के रूप में चिह्नित करें।`
  }

  return `Document Type: ${documentType}
Language: English

Reviewed Extracted Clinical Parameters:
${fieldsJson}

Uncertainties or unreadable items:
${uncertaintiesJson}

Please generate a practical, patient-friendly actionable checklist in JSON format grounded in these parameters.
Keep titles and descriptions concise and plain-language.
Never suggest changing medication. Tag document-derived items as source: "document" and general prep items as source: "general_suggestion".`
}
