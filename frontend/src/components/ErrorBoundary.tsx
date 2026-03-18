import React from 'react'

export class ErrorBoundary extends React.Component<any, {error: any}> {
  constructor(props: any) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error: any) { return { error } }
  componentDidCatch(error: any, info: any) { console.error('ErrorBoundary caught', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-red-50">
          <div className="max-w-xl bg-white rounded-xl shadow p-6 border">
            <h2 className="text-lg font-bold mb-2">Application Error</h2>
            <pre className="text-xs whitespace-pre-wrap text-red-700">{String(this.state.error)}</pre>
            <p className="text-sm text-gray-600 mt-3">Open developer console for more details.</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
