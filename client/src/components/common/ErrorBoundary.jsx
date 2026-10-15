import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    } else {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto py-12 px-4">
          <Card className="p-8 text-center space-y-5 border-l-4 border-l-danger-500 shadow-card-lg">
            <div className="h-14 w-14 rounded-2xl bg-danger-50 text-danger-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-surface-900">
                {this.props.title || 'Something went wrong'}
              </h2>
              <p className="text-sm text-surface-600 max-w-md mx-auto leading-relaxed">
                {this.props.message || 'An unexpected error occurred while displaying this page. Please click retry to reload.'}
              </p>
            </div>
            <div className="pt-2 flex justify-center">
              <Button variant="primary" onClick={this.handleRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                <span>{this.props.retryText || 'Try again'}</span>
              </Button>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
