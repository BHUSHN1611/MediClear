/**
 * Doctor Questions Prompts for Gemini Integration
 * 
 * Clinical Guardrails:
 * 1. Ground questions directly in the patient's extracted parameters and findings.
 * 2. Clearly distinguish document-derived questions from general discussion questions.
 * 3. Never invent diagnoses or advise altering treatments.
 * 4. Empower patients to communicate effectively with their licensed healthcare provider.
 * 5. Return structured JSON conforming strictly to DoctorQuestionsOutputSchema.
 */

export const QUESTION_SYSTEM_PROMPT = `You are MediClear, an educational medical document assistant.
Your task is to generate thoughtful, empowering, and respectful questions that the patient can take to their next healthcare consultation.

CRITICAL MEDICAL & SAFETY RULES:
1. NEVER diagnose conditions or assert that the patient has a specific disease.
2. NEVER suggest medication changes or question the doctor's authority.
3. GROUND QUESTIONS in the reviewed parameters:
   - If a lab test is high or low, formulate a question asking what that specific finding means for the patient and what lifestyle or follow-up is recommended.
   - If a medication is prescribed, formulate a question about duration, food timing, or precautions.
   - If a discharge summary has instructions, formulate questions about recovery milestones or warning signs.
4. CLEARLY DISTINGUISH:
   - "source": "document" for questions directly referencing specific extracted test values or prescribed medications.
   - "source": "general_suggestion" for general health or appointment preparation questions (e.g. asking about routine vaccinations or family history).
5. Output MUST be a single valid JSON object with this exact shape:
{
  "documentType": "lab_report" | "prescription" | "discharge_instructions" | "unknown",
  "language": "en" | "hi",
  "questions": [
    {
      "id": "q_1",
      "question": "Clear, concise question for the doctor",
      "category": "Lab Results" | "Medications" | "Lifestyle & Diet" | "Follow-up" | "General",
      "rationale": "Brief plain-language explanation of why this question is useful",
      "source": "document" | "general_suggestion"
    }
  ]
}
Do NOT include markdown formatting or backticks around the JSON.`

export function buildQuestionsUserPrompt({
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

कृपया ऊपर दिए गए सत्यापित विवरणों के आधार पर डॉक्टर से परामर्श के लिए व्यावहारिक प्रश्नों की सूची (Doctor Questions) JSON प्रारूप में तैयार करें।
सभी प्रश्न और कारण (rationale) स्वाभाविक, सरल एवं स्पष्ट हिन्दी (Devanagari) में होने चाहिए।
विशिष्ट रिपोर्ट मानों से संबंधित प्रश्नों को source: "document" और सामान्य प्रश्नों को source: "general_suggestion" के रूप में चिह्नित करें।`
  }

  return `Document Type: ${documentType}
Language: English

Reviewed Extracted Clinical Parameters:
${fieldsJson}

Uncertainties or unreadable items:
${uncertaintiesJson}

Please generate an empowering list of doctor consultation questions in JSON format grounded in these parameters.
Questions should help the patient understand their results and clarify next steps with their doctor.
Tag parameters-specific questions as source: "document" and general wellness questions as source: "general_suggestion".`
}
