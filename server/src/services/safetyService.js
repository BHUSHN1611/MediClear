/**
 * Medical Safety Guardrails Engine
 * 
 * Implements deterministic safety rules to catch:
 * 1. Emergency warning signs (chest pain, stroke symptoms, acute respiratory distress, etc.)
 * 2. Medication modification requests (starting/stopping/changing dosages)
 * 3. Diagnostic inference demands ("do I have cancer?", "diagnose me")
 * 4. Prompt injections or system override attempts
 * 
 * Operates independently of AI model statements to ensure reliable patient safety.
 */

const EMERGENCY_PATTERNS = [
  /\b(?:chest\s*pain|heart\s*attack|severe\s*chest\s*pressure|chest\s*tightness|crushing\s*chest\s*pain|pain\s*radiating\s*to\s*(?:arm|jaw))\b/i,
  /\b(?:difficulty\s*breathing|cannot\s*breathe|shortness\s*of\s*breath|short\s*of\s*breath|choking|gasping\s*for\s*air|trouble\s*breathing|struggling\s*to\s*breathe)\b/i,
  /\b(?:sudden\s*numbness|face\s*droop(?:ing)?|slurred\s*speech|stroke\s*symptoms|cannot\s*move\s*(?:arm|leg|face))\b/i,
  /\b(?:coughing\s*(?:up\s*)?blood|vomiting\s*blood|hemoptysis|severe\s*uncontrolled\s*bleeding)\b/i,
  /\b(?:loss\s*of\s*consciousness|passed\s*out|unresponsive|fainted|blacked\s*out|collapsed)\b/i,
  /\b(?:severe\s*allergic\s*reaction|anaphylaxis|throat\s*swelling)\b/i,
  /\b(?:suicide|suicidal|end\s*my\s*life|overdose|swallowed\s*poison|took\s*too\s*many\s*pills)\b/i,
  // Hindi Emergency Keywords (Devanagari)
  /(?:सीने\s*में\s*(?:तेज\s*)?(?:दर्द|भारीपन|जकड़न)|दिल\s*का\s*दौरा|हार्ट\s*अटैक|सांस\s*(?:लेने\s*में\s*)?(?:तकलीफ|कठिनाई|दिक्कत)|सांस\s*फूल|खून\s*की\s*उल्टी|बेहोश|बेहोशी|लकवा|आत्महत्या)/,
  // Hinglish / Romanized Hindi Emergency Keywords
  /\b(?:seene\s*me(?:in)?\s*(?:tez\s*)?dard|chhati\s*me(?:in)?\s*dard|dil\s*ka\s*daura|heart\s*attack\s*aa\s*gaya)\b/i,
  /\b(?:saans\s*(?:lene\s*me(?:in)?\s*)?(?:dikkat|takleef|problem)|saans\s*phool\s*rahi|khoon\s*ki\s*ulti|behosh\s*ho\s*gaya)\b/i,
]

const MEDICATION_CHANGE_PATTERNS = [
  /\b(?:should\s*i|can\s*i|could\s*i)\s*(?:stop|quit|discontinue|start|change|increase|decrease|double|reduce|skip|alter|replace|halve|cut)\b.*?\b(?:medication|medicine|pill|dose|dosage|drug|tablet|statin|steroid|antibiotic|insulin|capsule|injection)\b/i,
  /\b(?:stop|quit|discontinue|start|change|increase|decrease|double|reduce|skip|alter|replace|halve|cut)\s+(?:taking\s+)?(?:my\s+|the\s+)?(?:\w+\s+)?(?:medication|medicine|pill|dose|dosage|drug|tablet|statin|steroid|antibiotic|insulin|capsule|injection)\b/i,
  /\b(?:prescribe\s*(?:me)?\s*(?:a|some)?\s*(?:medicine|pill|drug|antibiotic))\b/i,
  // Hindi Medication Change Keywords (Devanagari)
  /(?:दवा(?:ई)?\s*(?:बंद|रोक|बदल|शुरू|कम|ज्यादा|आधी)(?:\s*(?:कर|दूं|दे|लूं|लो))?|खुराक\s*(?:बढ़ा|घटा|आधी)|दवाई\s*(?:लिख\s*दो|छोड़|लेना\s*बंद)|गोली\s*(?:बंद|रोक))/,
  // Hinglish Medication Change Keywords
  /\b(?:dawa|dawae|medicine|goli)\s*(?:band\s*kar|rok\s*du|badal\s*du|shuru\s*kar|kam\s*kar|zyada\s*kar)\b/i,
  /\b(?:khurak|dosage?)\s*(?:badha|ghata|kam\s*kar|aadhi\s*kar)\b/i,
]

const DIAGNOSTIC_DEMAND_PATTERNS = [
  /\b(?:do\s*i\s*have|could\s*i\s*have|might\s*i\s*have)\s*(?:cancer|diabetes|heart\s*disease|stroke|kidney\s*failure|covid|hypertension|tb|pneumonia)\b/i,
  /\b(?:diagnose\s*(?:me|my\s*condition|this\s*disease|my\s*symptoms|what\s*i\s*have))\b/i,
  /\b(?:what\s*(?:disease|illness|condition|infection)\s*do\s*i\s*have)\b/i,
  /\b(?:tell\s*me\s*if\s*i\s*am\s*(?:sick|dying|terminal|ill))\b/i,
  /\b(?:is\s*this\s*(?:cancer|a\s*heart\s*attack|a\s*stroke))\b/i,
  // Hindi Diagnostic Keywords (Devanagari)
  /(?:क्या\s*मुझे\s*(?:कैंसर|डायबिटीज|बीमारी|रोग)\s*है|मेरा\s*(?:रोग|निदान)\s*(?:पहचान|बता|करें)|क्या\s*यह\s*(?:कैंसर|गंभीर\s*बीमारी)\s*है)/,
  // Hinglish Diagnostic Keywords
  /\b(?:kya\s*mujhe\s*(?:cancer|diabetes|bimari|rog)\s*hai)\b/i,
  /\b(?:kya\s*ye\s*(?:cancer|serious)\s*hai)\b/i,
  /\b(?:meri\s*bimari\s*(?:batao|pehchano|diagnose\s*karo))\b/i,
]

const PROMPT_INJECTION_PATTERNS = [
  /\b(?:ignore\s*(?:all\s*)?previous\s*instructions|disregard\s*(?:all\s*)?safety\s*rules)\b/i,
  /\b(?:you\s*are\s*now\s*a\s*licensed\s*medical\s*doctor|act\s*as\s*(?:a\s*)?physician\s*without\s*rules)\b/i,
]

export const safetyService = {
  /**
   * Deterministic safety check for user inputs or questions
   */
  checkClinicalSafety(text = '', { language = 'en' } = {}) {
    if (!text || typeof text !== 'string') {
      return { safe: true, flags: [] }
    }

    const flags = []

    // 1. Check for Emergency Signs
    for (const pattern of EMERGENCY_PATTERNS) {
      if (pattern.test(text)) {
        flags.push('EMERGENCY_DETECTED')
        return {
          safe: false,
          category: 'EMERGENCY',
          flags,
          redirectMessage:
            language === 'hi'
              ? 'आपातकालीन सूचना: यदि आप सीने में दर्द, सांस लेने में अत्यधिक कठिनाई, या किसी आपातकालीन लक्षण का सामना कर रहे हैं, तो तुरंत स्थानीय आपातकालीन सेवाओं (112 या 102) पर कॉल करें या नजदीकी अस्पताल के आपातकालीन कक्ष में जाएं।'
              : 'EMERGENCY WARNING: If you are experiencing chest pain, difficulty breathing, or severe sudden symptoms, stop and call your local emergency medical services (112 / 102 / 911) or visit the nearest hospital emergency room immediately.',
        }
      }
    }

    // 2. Check for Medication Alteration Requests
    for (const pattern of MEDICATION_CHANGE_PATTERNS) {
      if (pattern.test(text)) {
        flags.push('MEDICATION_ALTERATION_PROHIBITED')
        return {
          safe: false,
          category: 'MEDICATION_CHANGE',
          flags,
          redirectMessage:
            language === 'hi'
              ? 'दवा सुरक्षा सूचना: मेडीक्लियर दवाओं को शुरू करने, रोकने या बदलने की सलाह नहीं देता है। कोई भी बदलाव करने से पहले हमेशा अपने डॉक्टर से परामर्श लें।'
              : 'MEDICATION SAFETY NOTICE: MediClear cannot advise on starting, stopping, increasing, or changing medications or dosages. Never alter your prescription without consulting your prescribing doctor.',
        }
      }
    }

    // 3. Check for Diagnostic Demands
    for (const pattern of DIAGNOSTIC_DEMAND_PATTERNS) {
      if (pattern.test(text)) {
        flags.push('DIAGNOSTIC_DEMAND_REFUSED')
        return {
          safe: false,
          category: 'DIAGNOSTIC_CLAIM',
          flags,
          redirectMessage:
            language === 'hi'
              ? 'नैदानिक अस्वीकरण: मेडीक्लियर एक शैक्षिक उपकरण है और रोगों का निदान नहीं कर सकता। कृपया व्यक्तिगत नैदानिक मूल्यांकन के लिए योग्य चिकित्सक से मिलें।'
              : 'DIAGNOSTIC NOTICE: MediClear is an educational document assistant and cannot diagnose diseases or medical conditions. Please consult a qualified healthcare professional for medical diagnosis.',
        }
      }
    }

    // 4. Check for Prompt Injections
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        flags.push('PROMPT_INJECTION_DETECTED')
        return {
          safe: false,
          category: 'PROMPT_INJECTION',
          flags,
          redirectMessage:
            language === 'hi'
              ? 'अनुरोध अस्वीकृत: सिस्टम सुरक्षा नीतियों को दरकिनार नहीं किया जा सकता।'
              : 'Request rejected: Safety policies cannot be overridden.',
        }
      }
    }

    return { safe: true, flags: [] }
  },

  /**
   * Post-generation safety validation for AI outputs
   * Verifies that the model did not emit forbidden diagnostic or medication instructions.
   */
  validateAiExplanationSafety(explanation, language = 'en') {
    if (!explanation) return explanation

    const summaryText = (explanation.summary || []).join(' ')
    const flags = [...(explanation.safetyFlags || [])]

    // Forbidden diagnostic phrases
    const forbiddenPhrases = [
      /\byou\s*have\s*(?:been\s*diagnosed\s*with|contracted)\b/i,
      /\bwe\s*diagnose\s*you\b/i,
      /\byou\s*should\s*stop\s*taking\b/i,
      /\byou\s*must\s*take\s*[0-9]+\s*mg\b/i,
    ]

    let sanitizedSummary = explanation.summary || []
    let modified = false

    for (const phrase of forbiddenPhrases) {
      if (phrase.test(summaryText)) {
        flags.push('UNSAFE_LANGUAGE_SANITIZED')
        modified = true
      }
    }

    if (modified) {
      // Replace with safe clinical phrasing
      const safeNote =
        language === 'hi'
          ? 'नोट: यह रिपोर्ट केवल शैक्षिक समीक्षा के लिए समझाई गई है। किसी भी निदान या दवा उपचार के लिए अपने डॉक्टर से परामर्श करें।'
          : 'Note: This explanation is for educational purposes only. Diagnostic interpretation and treatment decisions require direct evaluation by a qualified doctor.'
      sanitizedSummary = sanitizedSummary.map((s) =>
        s.replace(/you\s*(?:have\s*been\s*diagnosed|are\s*diagnosed)\s*with/gi, 'your report indicates parameters related to')
      )
      sanitizedSummary.push(safeNote)
    }

    return {
      ...explanation,
      summary: sanitizedSummary,
      safetyFlags: Array.from(new Set(flags)),
    }
  },
}
