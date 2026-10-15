import { getGeminiClient, isGeminiConfigured, GEMINI_MODEL, getCandidateModels } from '../config/gemini.js'
import { CHECKLIST_SYSTEM_PROMPT, buildChecklistUserPrompt } from '../prompts/checklistPrompt.js'
import { dataRepository } from './dataRepository.js'
import { ChecklistOutputSchema } from '../validators/aiOutputSchemas.js'

/**
 * Deterministic Clinical Fallback Checklist Engine
 * Grounded in reviewed extracted parameters and document type.
 */
export function generateDeterministicChecklist({
  documentId,
  documentType = 'unknown',
  fields = [],
  uncertainties = [],
  language = 'en',
}) {
  const isHindi = language === 'hi'
  const items = []

  if (!fields || fields.length === 0) {
    items.push({
      id: 'chk_1',
      title: isHindi
        ? 'दस्तावेज़ का डॉक्टर से सत्यापन कराएं'
        : 'Verify document directly with your physician',
      description: isHindi
        ? 'इस दस्तावेज़ में कोई स्पष्ट नैदानिक मान नहीं मिले। कृपया क्लिनिक से मूल प्रति जांचें।'
        : 'No readable clinical instructions were extracted. Present the original document to your healthcare provider.',
      category: 'appointment_prep',
      source: 'general_suggestion',
      isCompleted: false,
    })

    return ChecklistOutputSchema.parse({
      documentId,
      language,
      documentType,
      items,
      generatedAt: new Date().toISOString(),
    })
  }

  let counter = 1

  if (documentType === 'lab_report') {
    const abnormal = fields.filter((f) => f.status === 'high' || f.status === 'low')

    if (abnormal.length > 0) {
      const names = abnormal.map((f) => f.key).slice(0, 3).join(', ')
      items.push({
        id: `chk_${counter++}`,
        title: isHindi
          ? `असामान्य मानों (${names}) पर डॉक्टर से चर्चा करें`
          : `Discuss out-of-range biomarkers (${names}) with your doctor`,
        description: isHindi
          ? 'अपने डॉक्टर से पूछें कि इन मानों के संदर्भ में क्या अतिरिक्त जांच या जीवनशैली बदलाव आवश्यक हैं।'
          : 'Consult your physician about whether repeat testing, lifestyle changes, or treatment are advised.',
        category: 'follow_up',
        source: 'document',
        isCompleted: false,
      })
    } else {
      items.push({
        id: `chk_${counter++}`,
        title: isHindi
          ? 'प्रयोगशाला परिणामों की डॉक्टर से समीक्षा कराएं'
          : 'Review laboratory panel with your healthcare provider',
        description: isHindi
          ? 'जांच परिणाम सामान्य संदर्भ सीमा के भीतर होने पर भी अपने नियमित स्वास्थ्य परीक्षण में इसे साझा करें।'
          : 'Share this report during your regular checkup to confirm health maintenance goals.',
        category: 'follow_up',
        source: 'document',
        isCompleted: false,
      })
    }

    items.push({
      id: `chk_${counter++}`,
      title: isHindi
        ? 'पिछली सभी रक्त जांच रिपोर्ट साथ रखें'
        : 'Bring past laboratory reports to your appointment',
      description: isHindi
        ? 'डॉक्टर को समय के साथ आपके स्वास्थ्य रुझान को समझने में पुरानी रिपोर्ट से मदद मिलती है।'
        : 'Comparing previous test records helps your clinician identify longitudinal health trends.',
      category: 'appointment_prep',
      source: 'general_suggestion',
      isCompleted: false,
    })

    items.push({
      id: `chk_${counter++}`,
      title: isHindi
        ? 'यदि पुनः परीक्षण आवश्यक हो, तो खाली पेट (Fasting) रहने के निर्देश पूछें'
        : 'Clarify fasting instructions if repeat testing is scheduled',
      description: isHindi
        ? 'कुछ रक्त परीक्षणों (जैसे ग्लूकोज या लिपिड) के लिए 8-12 घंटे का उपवास आवश्यक हो सकता है।'
        : 'Certain metabolic biomarkers require 8 to 12 hours of fasting prior to sample collection.',
      category: 'test_prep',
      source: 'general_suggestion',
      isCompleted: false,
    })
  } else if (documentType === 'prescription') {
    const medNames = fields.map((f) => f.key).slice(0, 3).join(', ')

    items.push({
      id: `chk_${counter++}`,
      title: isHindi
        ? `निर्धारित दवाओं (${medNames}) को समय पर लें`
        : `Take prescribed medications (${medNames}) strictly as instructed`,
      description: isHindi
        ? 'नुस्खे पर लिखी गई खुराक और समय का ठीक से पालन करें। बिना डॉक्टर के परामर्श के दवा न बदलें।'
        : 'Adhere to written dosage timing and administration instructions provided on your prescription.',
      category: 'medication',
      source: 'document',
      isCompleted: false,
    })

    items.push({
      id: `chk_${counter++}`,
      title: isHindi
        ? 'फार्मासिस्ट से दवा सेवन (भोजन से पहले या बाद) की पुष्टि करें'
        : 'Confirm meal timing with your dispensing pharmacist',
      description: isHindi
        ? 'सुनिश्चित करें कि आपको ज्ञात है कि कौन सी दवा खाली पेट या भोजन के बाद लेनी है।'
        : 'Verify whether specific tablets should be taken before, during, or following meals.',
      category: 'medication',
      source: 'general_suggestion',
      isCompleted: false,
    })

    items.push({
      id: `chk_${counter++}`,
      title: isHindi
        ? 'दवाओं के दुष्प्रभाव या खुराक छूटने पर क्या करें, डॉक्टर से पूछें'
        : 'Clarify missed-dose protocols and possible side effects',
      description: isHindi
        ? 'यदि कभी खुराक छूट जाए तो क्या करना चाहिए, इसकी जानकारी अपने डॉक्टर से अवश्य लें।'
        : 'Ask your prescribing doctor what steps to take if you accidentally miss or delay a dose.',
      category: 'appointment_prep',
      source: 'general_suggestion',
      isCompleted: false,
    })
  } else if (documentType === 'discharge_instructions') {
    items.push({
      id: `chk_${counter++}`,
      title: isHindi
        ? 'डिस्चार्ज निर्देशों में दी गई देखभाल योजना का पालन करें'
        : 'Follow discharge care and recovery instructions',
      description: isHindi
        ? 'अस्पताल से छुट्टी के समय दिए गए घाव की देखभाल और गतिविधि नियमों का कड़ाई से पालन करें।'
        : 'Follow all wound dressing, rest, and activity restrictions outlined in your discharge summary.',
      category: 'lifestyle',
      source: 'document',
      isCompleted: false,
    })

    items.push({
      id: `chk_${counter++}`,
      title: isHindi
        ? 'निर्धारित तिथि पर फॉलो-अप अपॉइंटमेंट बुक करें'
        : 'Schedule your specified clinical follow-up appointment',
      description: isHindi
        ? 'डिस्चार्ज सारांश में बताई गई तारीख या समय सीमा पर डॉक्टर से पुनः मिलें।'
        : 'Ensure follow-up consultation is scheduled according to the hospital care team timeline.',
      category: 'follow_up',
      source: 'document',
      isCompleted: false,
    })

    items.push({
      id: `chk_${counter++}`,
      title: isHindi
        ? 'लक्षणों में कोई नया या गंभीर बदलाव दिखने पर तुरंत अस्पताल संपर्क करें'
        : 'Contact the clinic or emergency services if warning signs occur',
      description: isHindi
        ? 'यदि तेज बुखार, सांस की तकलीफ या अत्यधिक दर्द हो, तो बिना देर किए डॉक्टर से संपर्क करें।'
        : 'Promptly seek medical evaluation if you develop fever, acute pain, or sudden symptom changes.',
      category: 'follow_up',
      source: 'general_suggestion',
      isCompleted: false,
    })
  } else {
    items.push({
      id: `chk_${counter++}`,
      title: isHindi
        ? 'दस्तावेज़ को अपने आगामी डॉक्टर परामर्श में प्रस्तुत करें'
        : 'Present this document at your next doctor consultation',
      description: isHindi
        ? 'अपने डॉक्टर के साथ इस रिपोर्ट के प्रत्येक विवरण पर चर्चा करें।'
        : 'Review the extracted parameters and clinical findings with your personal physician.',
      category: 'appointment_prep',
      source: 'document',
      isCompleted: false,
    })

    items.push({
      id: `chk_${counter++}`,
      title: isHindi
        ? 'अपने वर्तमान लक्षणों और दवाओं की सूची बना लें'
        : 'Prepare a list of current symptoms and questions',
      description: isHindi
        ? 'अपॉइंटमेंट से पहले अपनी समस्याओं और प्रश्नों को लिख कर रख लें।'
        : 'Having a written list of symptoms and concerns improves doctor-patient communication.',
      category: 'appointment_prep',
      source: 'general_suggestion',
      isCompleted: false,
    })
  }

  return ChecklistOutputSchema.parse({
    documentId,
    language,
    documentType,
    items,
    generatedAt: new Date().toISOString(),
  })
}

/**
 * Main Service to Generate and Persist Checklist
 */
export async function generateDocumentChecklist({
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

  let checklistOutput = null

  // 1. Try Gemini API if configured
  if (isGeminiConfigured() && fields.length > 0) {
    try {
      const ai = getGeminiClient()
      const prompt = buildChecklistUserPrompt({
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
              systemInstruction: CHECKLIST_SYSTEM_PROMPT,
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
        // Ensure documentId and language are set
        parsedJson.documentId = documentId
        parsedJson.language = language
        parsedJson.documentType = documentType
        checklistOutput = ChecklistOutputSchema.parse(parsedJson)
      }
    } catch (aiErr) {
      console.warn(`[Gemini Checklist Warning] ${aiErr.message}. Falling back to deterministic checklist engine.`)
    }
  }

  // 2. Deterministic Fallback if AI not configured or failed
  if (!checklistOutput) {
    checklistOutput = generateDeterministicChecklist({
      documentId,
      documentType,
      fields,
      uncertainties,
      language,
    })
  }

  // 3. Persist to Database / Memory
  const saved = await dataRepository.createOrUpdateChecklist({
    documentId,
    sessionId: sessionId || document.sessionId,
    language,
    documentType,
    items: checklistOutput.items,
  })

  return saved
}
