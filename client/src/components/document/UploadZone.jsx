import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { UploadCloud, FileText, Image as ImageIcon, X, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import Button from '../ui/Button'
import Alert from '../ui/Alert'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']

export default function UploadZone({
  selectedFile,
  onFileSelect,
  onClearFile,
  onUseSample,
  disabled = false,
  className,
}) {
  const { t } = useTranslation()
  const [isDragOver, setIsDragOver] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const fileInputRef = useRef(null)

  const validateAndSetFile = (file) => {
    setErrorMessage(null)

    if (!file) return

    // Strict extension and mime validation
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    const isExtensionValid = ALLOWED_EXTENSIONS.includes(ext)
    const isMimeValid = !file.type || ALLOWED_MIME_TYPES.includes(file.type)

    if (!isExtensionValid || !isMimeValid) {
      setErrorMessage(t('upload.err_type'))
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(t('upload.err_size'))
      return
    }

    onFileSelect(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    if (disabled) return
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled) return

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      validateAndSetFile(droppedFiles[0])
    }
  }

  const handleInputChange = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      validateAndSetFile(files[0])
    }
  }

  const handleZoneClick = () => {
    if (disabled || selectedFile) return
    fileInputRef.current?.click()
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const getFileIcon = (file) => {
    if (file?.type === 'application/pdf' || file?.name?.endsWith('.pdf')) {
      return <FileText className="h-8 w-8 text-primary-600" aria-hidden="true" />
    }
    return <ImageIcon className="h-8 w-8 text-teal-600" aria-hidden="true" />
  }

  return (
    <div className={clsx('space-y-4', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
        aria-label="Upload document file"
      />

      {errorMessage && (
        <Alert variant="danger">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        </Alert>
      )}

      {!selectedFile ? (
        <div
          onClick={handleZoneClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleZoneClick()
            }
          }}
          className={clsx(
            'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all cursor-pointer select-none',
            isDragOver
              ? 'border-primary-500 bg-primary-50/60 scale-[1.01]'
              : 'border-surface-200 bg-surface-50/50 hover:bg-surface-50 hover:border-surface-300',
            disabled && 'opacity-60 cursor-not-allowed'
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 mb-4 shadow-sm">
            <UploadCloud className="h-7 w-7" aria-hidden="true" />
          </div>

          <h3 className="text-base font-semibold text-surface-900 mb-1">
            {t('upload.drag_here')}
          </h3>
          <p className="text-sm text-surface-500 mb-4">
            {t('upload.or_browse')}
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-100 text-surface-700 text-xs font-medium">
            <span>{t('upload.helper_text') || 'Supported: Lab reports, Prescriptions, Discharge instructions. PDF, JPG, PNG.'}</span>
          </div>

          {onUseSample && (
            <div className="mt-6 pt-4 border-t border-surface-200/80 w-full max-w-xs">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onUseSample()
                }}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
              >
                + {t('upload.try_demo') || 'Try a demo (sample data, not your document)'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-surface-200 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-100">
                {getFileIcon(selectedFile)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-surface-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-surface-500">
                  {formatFileSize(selectedFile.size)} · {selectedFile.type || 'Document'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.value = ''
                  onClearFile?.()
                }}
                title={t('upload.change')}
                aria-label={t('upload.change')}
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">{t('upload.change')}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
