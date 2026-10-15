import { setMockGeminiClient, resetMockGeminiClient } from '../src/config/gemini.js'

export function createMockGeminiClient(customHandler) {
  return {
    models: {
      generateContent: async ({ contents }) => {
        if (customHandler) {
          const custom = await customHandler({ contents })
          if (custom) return custom
        }

        // Default inspection of parts
        const inlinePart = contents?.[0]?.parts?.find((p) => p.inlineData)
        let decoded = ''
        if (inlinePart?.inlineData?.data) {
          try {
            decoded = Buffer.from(inlinePart.inlineData.data, 'base64').toString('utf-8')
          } catch {}
        }

        const lower = decoded.toLowerCase()

        if (decoded.includes('MALFORMED_CORRUPTED_DOCUMENT') || lower.includes('blurry') || lower.includes('unreadable')) {
          return {
            text: JSON.stringify({
              documentType: 'unsupported',
              isSupportedDocument: false,
              rejectionReason: 'The document image is blurry, corrupted, or unreadable.',
              fields: [],
              uncertainties: ['Document is unreadable.'],
              rawText: '',
              isUnreadable: true,
            }),
          }
        }

        if (
          lower.includes('invoice') ||
          lower.includes('receipt') ||
          lower.includes('passport') ||
          lower.includes('license') ||
          lower.includes('resume') ||
          lower.includes('random photo') ||
          lower.includes('unsupported')
        ) {
          return {
            text: JSON.stringify({
              documentType: 'unsupported',
              isSupportedDocument: false,
              rejectionReason: 'Document is not a recognized lab report, prescription, or discharge instruction.',
              fields: [],
              uncertainties: [],
              rawText: '',
              isUnreadable: false,
            }),
          }
        }

        if (lower.includes('blood group')) {
          return {
            text: JSON.stringify({
              documentType: 'lab_report',
              isSupportedDocument: true,
              rejectionReason: '',
              fields: [
                {
                  id: 'f1',
                  key: 'Blood Group',
                  value: 'B Positive',
                  unit: '',
                  referenceRange: '',
                  status: 'normal',
                  confidence: 'high',
                  isUserCorrected: false,
                },
                {
                  id: 'f2',
                  key: 'Rh Factor',
                  value: 'Positive',
                  unit: '',
                  referenceRange: '',
                  status: 'normal',
                  confidence: 'high',
                  isUserCorrected: false,
                },
              ],
              uncertainties: [],
              rawText: decoded.slice(0, 500),
              isUnreadable: false,
            }),
          }
        }

        if (lower.includes('rx') || lower.includes('prescription')) {
          return {
            text: JSON.stringify({
              documentType: 'prescription',
              isSupportedDocument: true,
              rejectionReason: '',
              fields: [
                {
                  id: 'f1',
                  key: 'Atorvastatin',
                  value: '10 mg',
                  unit: 'tablet',
                  referenceRange: 'Once daily at bedtime',
                  status: 'unspecified',
                  confidence: 'high',
                  isUserCorrected: false,
                },
                {
                  id: 'f2',
                  key: 'Metformin',
                  value: '500 mg',
                  unit: 'tablet',
                  referenceRange: 'Twice daily after meals',
                  status: 'unspecified',
                  confidence: 'high',
                  isUserCorrected: false,
                },
              ],
              uncertainties: [],
              rawText: decoded.slice(0, 500),
              isUnreadable: false,
            }),
          }
        }

        if (lower.includes('discharge')) {
          return {
            text: JSON.stringify({
              documentType: 'discharge_instructions',
              isSupportedDocument: true,
              rejectionReason: '',
              fields: [
                {
                  id: 'f1',
                  key: 'Discharge Diagnosis',
                  value: 'Acute Gastroenteritis (Resolved)',
                  unit: '',
                  referenceRange: '',
                  status: 'unspecified',
                  confidence: 'high',
                  isUserCorrected: false,
                },
                {
                  id: 'f2',
                  key: 'Dietary Instruction',
                  value: 'Bland soft diet for 48 hours; hydrate with ORS',
                  unit: '',
                  referenceRange: '',
                  status: 'unspecified',
                  confidence: 'high',
                  isUserCorrected: false,
                },
              ],
              uncertainties: [],
              rawText: decoded.slice(0, 500),
              isUnreadable: false,
            }),
          }
        }

        // Default: Lab report
        return {
          text: JSON.stringify({
            documentType: 'lab_report',
            isSupportedDocument: true,
            rejectionReason: '',
            fields: [
              {
                id: 'f1',
                key: 'Fasting Blood Glucose',
                value: '118',
                unit: 'mg/dL',
                referenceRange: '70 - 99',
                status: 'high',
                confidence: 'high',
                isUserCorrected: false,
              },
              {
                id: 'f2',
                key: 'Total Cholesterol',
                value: '224',
                unit: 'mg/dL',
                referenceRange: '< 200',
                status: 'high',
                confidence: 'high',
                isUserCorrected: false,
              },
              {
                id: 'f3',
                key: 'HDL Cholesterol',
                value: '42',
                unit: 'mg/dL',
                referenceRange: '> 40',
                status: 'normal',
                confidence: 'high',
                isUserCorrected: false,
              },
              {
                id: 'f4',
                key: 'LDL Cholesterol',
                value: '148',
                unit: 'mg/dL',
                referenceRange: '< 100',
                status: 'high',
                confidence: 'high',
                isUserCorrected: false,
              },
              {
                id: 'f5',
                key: 'Serum Triglycerides',
                value: '170',
                unit: 'mg/dL',
                referenceRange: '< 150',
                status: 'high',
                confidence: 'medium',
                isUserCorrected: false,
              },
            ],
            uncertainties: ['Faint stamp on bottom margin.'],
            rawText: decoded.slice(0, 500),
            isUnreadable: false,
          }),
        }
      },
    },
  }
}
