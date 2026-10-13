/**
 * Synthetic Demo Data for Phase 1
 * Represents a standard Indian laboratory report (Comprehensive Metabolic & Lipid Panel)
 * No real patient health information (PHI) is included.
 */

export const DEMO_DOCUMENT_ID = 'demo-lab-report-001'

export const DEMO_EXTRACTED_DATA = {
  documentId: DEMO_DOCUMENT_ID,
  documentType: 'lab_report',
  documentName: 'Sample_Lipid_Panel_Report.pdf',
  extractedAt: '2026-03-15T10:30:00Z',
  patientInfo: {
    ageRange: '40-50',
    gender: 'De-identified',
    specimenDate: '2026-03-14',
  },
  fields: [
    {
      id: 'f1',
      name: 'Fasting Blood Glucose',
      nameHi: 'फास्टिंग ब्लड ग्लूकोज',
      value: '118',
      unit: 'mg/dL',
      referenceRange: '70 - 99',
      status: 'high', // 'normal' | 'high' | 'low'
      confidence: 'high', // 'high' | 'medium' | 'low'
      clinicalNote: 'Slightly above standard fasting range. Indicates borderline elevated fasting blood sugar.',
    },
    {
      id: 'f2',
      name: 'Total Cholesterol',
      nameHi: 'कुल कोलेस्ट्रॉल',
      value: '224',
      unit: 'mg/dL',
      referenceRange: '< 200',
      status: 'high',
      confidence: 'high',
      clinicalNote: 'Elevated total serum cholesterol.',
    },
    {
      id: 'f3',
      name: 'HDL Cholesterol (Good)',
      nameHi: 'एचडीएल कोलेस्ट्रॉल (अच्छा)',
      value: '42',
      unit: 'mg/dL',
      referenceRange: '> 40',
      status: 'normal',
      confidence: 'high',
      clinicalNote: 'Within normal protective threshold.',
    },
    {
      id: 'f4',
      name: 'LDL Cholesterol (Bad)',
      nameHi: 'एलडीएल कोलेस्ट्रॉल (खराब)',
      value: '148',
      unit: 'mg/dL',
      referenceRange: '< 100',
      status: 'high',
      confidence: 'high',
      clinicalNote: 'Elevated low-density lipoprotein levels.',
    },
    {
      id: 'f5',
      name: 'Serum Triglycerides',
      nameHi: 'सीरम ट्राइग्लिसराइड्स',
      value: '170',
      unit: 'mg/dL',
      referenceRange: '< 150',
      status: 'high',
      confidence: 'medium',
      clinicalNote: 'Mildly elevated blood triglycerides.',
    },
    {
      id: 'f6',
      name: 'Hemoglobin (Hb)',
      nameHi: 'हीमोग्लोबिन',
      value: '14.2',
      unit: 'g/dL',
      referenceRange: '13.0 - 17.0',
      status: 'normal',
      confidence: 'high',
      clinicalNote: 'Normal red blood cell oxygen-carrying capacity.',
    },
    {
      id: 'f7',
      name: 'Serum Creatinine',
      nameHi: 'सीरम क्रिएटिनिन',
      value: '0.9',
      unit: 'mg/dL',
      referenceRange: '0.7 - 1.3',
      status: 'normal',
      confidence: 'high',
      clinicalNote: 'Normal kidney filtration marker.',
    },
  ],
  uncertainties: [
    {
      id: 'u1',
      field: 'Laboratory Collection Time',
      fieldHi: 'लैब नमूना संग्रह समय',
      reason: 'Stamp ink on document margin is partially smudged. Estimated between 07:30 AM and 08:15 AM.',
      reasonHi: 'दस्तावेज़ के हाशिये पर मुहर की स्याही धुंधली है। अनुमानित समय सुबह 07:30 से 08:15 के बीच है।',
    },
    {
      id: 'u2',
      field: 'Attending Physician Registration Number',
      fieldHi: 'चिकित्सक पंजीकरण संख्या',
      reason: 'Low contrast handwriting on footer line; please verify with the issuing diagnostic clinic.',
      reasonHi: 'निचली पंक्ति पर लिखावट स्पष्ट नहीं है; कृपया जारीकर्ता क्लिनिक से पुष्टि करें।',
    },
  ],
}

export const DEMO_EXPLANATION_DATA = {
  documentId: DEMO_DOCUMENT_ID,
  generatedAt: '2026-03-15T10:32:00Z',
  en: {
    summary:
      'This document is a blood test report (Lipid and Metabolic Panel). Overall, your kidney function and hemoglobin levels appear normal. However, your fasting blood sugar, total cholesterol, LDL (often called bad cholesterol), and triglycerides are slightly above standard reference ranges. This is commonly reviewed with a doctor to discuss diet, physical activity, or any necessary follow-up checks.',
    keyFacts: [
      {
        title: 'Fasting Blood Sugar is Elevated',
        description: 'Your level was 118 mg/dL (typical fasting range is under 100 mg/dL). This suggests pre-diabetic or borderline high fasting glucose.',
      },
      {
        title: 'Lipid Profile Shows Mild Elevation',
        description: 'Total cholesterol (224 mg/dL), LDL (148 mg/dL), and triglycerides (170 mg/dL) are above recommended thresholds.',
      },
      {
        title: 'Kidney Health & Blood Count Normal',
        description: 'Creatinine (0.9 mg/dL) and Hemoglobin (14.2 g/dL) are healthy and well within expected brackets.',
      },
    ],
    terms: [
      {
        term: 'Fasting Blood Glucose',
        definition: 'The concentration of sugar (glucose) in your bloodstream after not eating for at least 8 to 12 hours.',
      },
      {
        term: 'LDL Cholesterol',
        definition: 'Low-Density Lipoprotein, often called "bad cholesterol". Excess levels can gradually build up in artery walls.',
      },
      {
        term: 'Triglycerides',
        definition: 'A type of fat circulating in the blood that stores unused calories from the food you eat.',
      },
      {
        term: 'Serum Creatinine',
        definition: 'A normal waste byproduct generated by muscle activity that healthy kidneys filter out through urine.',
      },
    ],
    checklist: [
      {
        id: 'c1',
        title: 'Schedule a Follow-Up Consultation',
        description: 'Take this report to your primary doctor or general physician to discuss cholesterol and glucose findings.',
        category: 'Doctor Visit',
      },
      {
        id: 'c2',
        title: 'Keep a 7-Day Diet & Activity Journal',
        description: 'Note your daily intake of oily, deep-fried foods and refined sugars before speaking with your physician.',
        category: 'Lifestyle',
      },
      {
        id: 'c3',
        title: 'Ask About HbA1c Test',
        description: 'Your doctor may suggest an HbA1c blood test to review your 3-month average blood glucose control.',
        category: 'Diagnostic',
      },
      {
        id: 'c4',
        title: 'Maintain Regular Hydration',
        description: 'Continue drinking plenty of water daily to support normal metabolic function.',
        category: 'Wellness',
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'Do my elevated LDL and triglyceride levels require medication, or should we try dietary modifications first?',
        category: 'Treatment',
      },
      {
        id: 'q2',
        question: 'Should I take an HbA1c test to better understand my 3-month average blood sugar levels?',
        category: 'Testing',
      },
      {
        id: 'q3',
        question: 'When would you recommend repeating this fasting lipid panel to monitor any changes?',
        category: 'Follow-up',
      },
      {
        id: 'q4',
        question: 'Are there specific aerobic exercises or dietary changes you recommend based on my current health profile?',
        category: 'Lifestyle',
      },
    ],
  },
  hi: {
    summary:
      'यह दस्तावेज़ एक रक्त परीक्षण रिपोर्ट (लिपिड एवं मेटाबोलिक पैनल) है। कुल मिलाकर, आपके गुर्दे (किडनी) की कार्यप्रणाली और हीमोग्लोबिन का स्तर सामान्य है। हालांकि, आपका फास्टिंग ब्लड शुगर (खाली पेट शर्करा), कुल कोलेस्ट्रॉल, एलडीएल (खराब कोलेस्ट्रॉल) और ट्राइग्लिसराइड्स सामान्य सीमा से थोड़े अधिक हैं। आहार, जीवनशैली और आवश्यक परीक्षणों पर चर्चा के लिए डॉक्टर से परामर्श लेना उचित है।',
    keyFacts: [
      {
        title: 'खाली पेट रक्त शर्करा (फास्टिंग ब्लड शुगर) बढ़ा हुआ है',
        description: 'आपका स्तर 118 mg/dL था (सामान्य सीमा 100 mg/dL से कम होती है)। यह बॉर्डरलाइन उच्च शर्करा को दर्शाता है।',
      },
      {
        title: 'लिपिड प्रोफाइल में हल्का बढ़ाव',
        description: 'कुल कोलेस्ट्रॉल (224 mg/dL), एलडीएल (148 mg/dL), और ट्राइग्लिसराइड्स (170 mg/dL) अनुशंसित सीमाओं से अधिक हैं।',
      },
      {
        title: 'किडनी स्वास्थ्य और हीमोग्लोबिन सामान्य',
        description: 'क्रिएटिनिन (0.9 mg/dL) और हीमोग्लोबिन (14.2 g/dL) पूरी तरह से स्वस्थ सीमा में हैं।',
      },
    ],
    terms: [
      {
        term: 'फास्टिंग ब्लड ग्लूकोज',
        definition: 'कम से कम 8 से 12 घंटे कुछ न खाने के बाद आपके खून में शर्करा (ग्लूकोज) की मात्रा।',
      },
      {
        term: 'एलडीएल कोलेस्ट्रॉल (LDL)',
        definition: 'कम घनत्व वाला लिपोप्रोटीन, जिसे अक्सर "खराब कोलेस्ट्रॉल" कहा जाता है। इसकी अधिकता से धमनियों में रुकावट हो सकती है।',
      },
      {
        term: 'ट्राइग्लिसराइड्स',
        definition: 'रक्त में पाई जाने वाली वसा का एक प्रकार, जो भोजन से मिलने वाली अतिरिक्त कैलोरी को संग्रहीत करता है।',
      },
      {
        term: 'सीरम क्रिएटिनिन',
        definition: 'मांसपेशियों की गतिविधि से उत्पन्न होने वाला अपशिष्ट उत्पाद, जिसे स्वस्थ गुर्दे पेशाब के माध्यम से बाहर निकाल देते हैं।',
      },
    ],
    checklist: [
      {
        id: 'c1',
        title: 'डॉक्टर से परामर्श का समय तय करें',
        description: 'कोलेस्ट्रॉल और शुगर के परिणामों पर चर्चा करने के लिए इस रिपोर्ट को अपने डॉक्टर को दिखाएं।',
        category: 'चिकित्सक परामर्श',
      },
      {
        id: 'c2',
        title: '7 दिनों का आहार और गतिविधि रिकॉर्ड रखें',
        description: 'डॉक्टर से मिलने से पहले अपने दैनिक तले-भुने भोजन और चीनी के सेवन पर नज़र रखें।',
        category: 'जीवनशैली',
      },
      {
        id: 'c3',
        title: 'HbA1c परीक्षण के बारे में पूछें',
        description: 'पिछले 3 महीनों के औसत ब्लड शुगर स्तर को जानने के लिए आपका डॉक्टर HbA1c टेस्ट की सलाह दे सकता है।',
        category: 'जांच',
      },
      {
        id: 'c4',
        title: 'पर्याप्त पानी पिएं',
        description: 'सामान्य शारीरिक कार्यप्रणाली को बनाए रखने के लिए रोजाना पर्याप्त पानी पिएं।',
        category: 'स्वास्थ्य',
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'क्या मेरे बढ़े हुए एलडीएल और ट्राइग्लिसराइड्स के लिए दवा की आवश्यकता है, या पहले खान-पान में बदलाव करना चाहिए?',
        category: 'उपचार',
      },
      {
        id: 'q2',
        question: 'क्या मुझे पिछले 3 महीनों के औसत ब्लड शुगर को समझने के लिए HbA1c टेस्ट कराना चाहिए?',
        category: 'जांच',
      },
      {
        id: 'q3',
        question: 'आप इस लिपिड पैनल टेस्ट को दोबारा कब दोहराने की सलाह देंगे?',
        category: 'फॉलो-अप',
      },
      {
        id: 'q4',
        question: 'मेरी स्थिति को देखते हुए आप कौन से व्यायाम या खान-पान में बदलाव की सलाह देते हैं?',
        category: 'जीवनशैली',
      },
    ],
  },
}
