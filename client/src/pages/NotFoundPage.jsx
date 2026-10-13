import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileQuestion, Home } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="max-w-md mx-auto my-auto text-center py-16">
      <Card className="p-8 space-y-6">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-surface-100 flex items-center justify-center text-surface-400">
          <FileQuestion className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-surface-900">
            {t('errors.not_found_title')}
          </h1>
          <p className="text-sm text-surface-500">
            {t('errors.not_found_body')}
          </p>
        </div>

        <Link to="/" className="inline-block">
          <Button variant="primary">
            <Home className="h-4 w-4 mr-1.5" />
            <span>{t('errors.go_home')}</span>
          </Button>
        </Link>
      </Card>
    </div>
  )
}
