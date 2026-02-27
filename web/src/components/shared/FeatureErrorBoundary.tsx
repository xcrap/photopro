import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface FeatureErrorBoundaryProps {
  section: string
  children: ReactNode
}

interface FeatureErrorBoundaryState {
  hasError: boolean
  message: string | null
}

export class FeatureErrorBoundary extends Component<FeatureErrorBoundaryProps, FeatureErrorBoundaryState> {
  state: FeatureErrorBoundaryState = {
    hasError: false,
    message: null,
  }

  static getDerivedStateFromError(error: Error): FeatureErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`Feature "${this.props.section}" crashed.`, error, info.componentStack)
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      message: null,
    })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <section className="surface p-5 text-sm">
        <h2 className="text-base font-semibold">Something went wrong</h2>
        <p className="mt-2 text-muted-foreground/80">
          {this.props.section} could not be rendered.
        </p>
        {this.state.message && (
          <p className="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-mono text-xs text-foreground/80">
            {this.state.message}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-md border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-white/[0.06]"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-white/[0.06]"
          >
            Reload app
          </button>
        </div>
      </section>
    )
  }
}
