import { getGeminiClient, isGeminiConfigured, GEMINI_MODEL, getCandidateModels } from '../config/gemini.js'
import { QUESTION_SYSTEM_PROMPT, buildQuestionsUserPrompt } from '../prompts/questionPrompt.js'
import { dataRepository } from './dataRepository.js'
import { DoctorQuestionsOutputSchema } from '../validators/aiOutputSchemas.js'

/**
 * Deterministic Clinical Fallback Questions Engine
 * Grounded in reviewed extracted parameters and findings.
 */
export function generateDeterministicDoctorQuestions({
  documentId,
  documentType = 'unknown',
  fields = [],
  uncertainties = [],
  language = 'en',
}) {
  const isHindi = language === 'hi'
  const questions = []

  if (!fields || fields.length === 0) {
    questions.push({
      id: 'q_1',
      question: isHindi
        ? 'क्या आप इस मूल रिपोर्ट को देखकर इसके मुख्य निष्कर्षों की पुष्टि कर सकते हैं?'
        : 'Could you review this original document and confirm its key medical findings?',
      category: 'General',
      rationale: isHindi
        ? 'दस्तावेज़ में अस्पष्टता होने के कारण चिकित्सक द्वारा प्रत्यक्ष सत्यापन आवश्यक है।'
        : 'Direct clinical review is required when document parameters are unreadable or incomplete.',
      source: 'general_suggestion',
    })

    return DoctorQuestionsOutputSchema.parse({
      documentId,
      language,
      documentType,
      questions,
      generatedAt: new Date().toISOString(),
    })
  }

  let counter = 1

  if (documentType === 'lab_report') {
    const abnormal = fields.filter((f) => f.status === 'high' || f.status === 'low')

    if (abnormal.length > 0) {
      for (const item of abnormal.slice(0, 2)) {
        questions.push({
          id: `q_${counter++}`,
          question: isHindi
            ? `मेरी रिपोर्ट में '${item.key}' का स्तर ${item.value} ${item.unit || ''} दर्ज है। इसका मेरे स्वास्थ्य के लिए क्या अर्थ है?`
            : `My report shows '${item.key}' at ${item.value} ${item.unit || ''}. What does this finding mean for my overall health?`,
          category: 'Lab Results',
          rationale: isHindi
            ? 'असामान्य बायोमार्कर के संदर्भ में व्यक्तिगत नैदानिक सलाह प्राप्त करने के लिए।'
            : 'Clarifies individual health implications of out-of-range clinical biomarkers.',
          source: 'document',
        })

        questions.push({
          id: `q_${counter++}`,
          question: isHindi
            ? `क्या '${item.key}' को नियंत्रित करने के लिए जीवनशैली या आहार में बदलाव पर्याप्त होगा या दवा आवश्यक होगी?`
            : `Are dietary and lifestyle modifications sufficient to address my '${item.key}' level, or is medication recommended?`,
          category: 'Lifestyle & Diet',
          rationale: isHindi
            ? 'उपचार विकल्पों और रोकथाम के तरीकों को स्पष्ट करने के लिए।'
            : 'Helps determine whether non-pharmacologic interventions are viable first steps.',
          source: 'document',
        })
      }
    } else {
      questions.push({
        id: `q_${counter++}`,
        question: isHindi
          ? 'मेरी जांच रिपोर्ट के अनुसार अधिकांश मान सामान्य हैं; क्या मुझे किसी विशिष्ट परीक्षण की आवश्यकता है?'
          : 'My laboratory values appear within standard brackets; are there any additional tests or preventative measures you recommend?',
        category: 'Lab Results',
        rationale: isHindi
          ? 'नियमित स्वास्थ्य लक्ष्यों और व्यक्तिगत जोखिम कारकों पर चर्चा के लिए।'
          : 'Confirms routine preventative care goals tailored to personal health history.',
        source: 'document',
      })
    }

    questions.push({
      id: `q_${counter++}`,
      question: isHindi
        ? 'मुझे इन परीक्षणों को दोबारा कितने समय बाद दोहराना चाहिए?'
        : 'When should I schedule a follow-up or repeat panel for these tests?',
      category: 'Follow-up',
      rationale: isHindi
        ? 'निगरानी की उचित समय सीमा निर्धारित करने के लिए।'
        : 'Establishes the appropriate clinical monitoring schedule for these biomarkers.',
      source: 'general_suggestion',
    })
  } else if (documentType === 'prescription') {
    for (const item of fields.slice(0, 2)) {
      questions.push({
        id: `q_${counter++}`,
        question: isHindi
          ? `मुझे '${item.key}' दवा कितने दिनों या महीनों तक लेनी होगी?`
          : `How long do you anticipate I will need to take '${item.key}'?`,
        category: 'Medications',
        rationale: isHindi
          ? 'उपचार की अपेक्षित अवधि समझने के लिए।'
          : 'Clarifies the planned duration and milestones for prescribed therapy.',
        source: 'document',
      })

      questions.push({
        id: `q_${counter++}`,
        question: isHindi
          ? `क्या '${item.key}' के साथ किसी खास खाद्य पदार्थ या अन्य सामान्य दवाओं से परहेज करना जरूरी है?`
          : `Are there specific foods, vitamins, or over-the-counter medicines I should avoid while taking '${item.key}'?`,
        category: 'Medications',
        rationale: isHindi
          ? 'दवाओं के आपसी दुष्प्रभाव और प्रतिकूल प्रतिक्रियाओं से बचाव के लिए।'
          : 'Prevents drug-nutrient interactions and accidental contraindications.',
        source: 'document',
      })
    }

    questions.push({
      id: `q_${counter++}`,
      question: isHindi
        ? 'यदि मुझे कोई प्रतिकूल लक्षण या चक्कर महसूस हो, तो मुझे क्या कदम उठाने चाहिए?'
        : 'What side effects should I be mindful of, and when should I contact your office?',
      category: 'General',
      rationale: isHindi
        ? 'संभावित दुष्प्रभावों की समय पर पहचान और सुरक्षा के लिए।'
        : 'Ensures clear protocol if adverse reactions or medication tolerance issues develop.',
      source: 'general_suggestion',
    })
  } else if (documentType === 'discharge_instructions') {
    questions.push({
      id: `q_${counter++}`,
      question: isHindi
        ? 'डिस्चार्ज के बाद पूरी तरह ठीक होने में आमतौर पर कितना समय लगता है?'
        : 'What is the expected recovery timeline following this hospital discharge?',
      category: 'Follow-up',
      rationale: isHindi
        ? 'दैनिक गतिविधियों और काम पर लौटने की समय सीमा जानने के लिए।'
        : 'Sets realistic expectations for physical recovery and resumption of work.',
      source: 'document',
    })

    questions.push({
      id: `q_${counter++}`,
      question: isHindi
        ? 'किन लक्षणों के दिखने पर मुझे तुरंत आपातकालीन सहायता या अस्पताल से संपर्क करना चाहिए?'
        : 'Which specific red-flag symptoms should trigger immediate medical evaluation during my recovery?',
      category: 'General',
      rationale: isHindi
        ? 'गंभीर जटिलताओं से बचाव हेतु आपातकालीन संकेतों की स्पष्ट समझ के लिए।'
        : 'Provides vital guidance on identifying early clinical deterioration.',
      source: 'general_suggestion',
    })
  } else {
    questions.push({
      id: `q_${counter++}`,
      question: isHindi
        ? 'इस रिपोर्ट के निष्कर्षों के आधार पर मेरे अगले स्वास्थ्य कदम क्या होने चाहिए?'
        : 'Based on these document findings, what are the recommended next clinical steps for my care?',
      category: 'General',
      rationale: isHindi
        ? 'चिकित्सक से स्पष्ट मार्गदर्शन प्राप्त करने के लिए।'
        : 'Clarifies diagnosis and treatment planning directly with the attending physician.',
      source: 'document',
    })
  }

  return DoctorQuestionsOutputSchema.parse({
    documentId,
    language,
    documentType,
    questions,
    generatedAt: new Date().toISOString(),
  })
}

/**
 * Main Service to Generate and Persist Doctor Questions
 */
export async function generateDocumentDoctorQuestions({
  document,
  extractedData,
  language = 'en',
  sessionId,
}) {
  if (language !== 'en' && language !== 'hi') {
    const error = new Error(`Unsupported language '${language}'. Supported languages: 'en', 'hi'.`)
    error.status = 400
    error.code = 'UNSUPPORTED_LANGUAGE'
    throw error
  }

  const documentId = document._id || document.id
  const { documentType = 'unknown', fields = [], uncertainties = [] } = extractedData || {}

  let questionsOutput = null

  // 1. Try Gemini API if configured
  if (isGeminiConfigured() && fields.length > 0) {
    try {
      const ai = getGeminiClient()
      const prompt = buildQuestionsUserPrompt({
        documentType,
        fields,
        uncertainties,
        language,
      })

      const candidateModels = getCandidateModels()
      let response = null
      for (const model of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              systemInstruction: QUESTION_SYSTEM_PROMPT,
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          })
          if (response?.text) break
        } catch (callErr) {
          const errMsg = callErr.message || ''
          const isRetriable =
            errMsg.includes('404') ||
            errMsg.includes('503') ||
            errMsg.includes('NOT_FOUND') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('no longer available')
          if (!isRetriable) throw callErr
        }
      }

      const responseText = response.text
      if (responseText) {
        const parsedJson = JSON.parse(responseText)
        parsedJson.documentId = documentId
        parsedJson.language = language
        parsedJson.documentType = documentType
        questionsOutput = DoctorQuestionsOutputSchema.parse(parsedJson)
      }
    } catch (aiErr) {
      console.warn(`[Gemini Questions Warning] ${aiErr.message}. Falling back to deterministic questions engine.`)
    }
  }

  // 2. Deterministic Fallback if AI not configured or failed
  if (!questionsOutput) {
    questionsOutput = generateDeterministicDoctorQuestions({
      documentId,
      documentType,
      fields,
      uncertainties,
      language,
    })
  }

  // 3. Persist to Database / Memory
  const saved = await dataRepository.createOrUpdateDoctorQuestions({
    documentId,
    sessionId: sessionId || document.sessionId,
    language,
    documentType,
    questions: questionsOutput.questions,
  })

  return saved
}
