import * as React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    try {
      // Log helpful debug info to the console to diagnose invalid hook calls
      // including React version
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reactVersion = (React as any)?.version ?? 'unknown';
      console.error('[ErrorBoundary] Caught error:', error, info, 'React.version=', reactVersion);
    } catch (e) {
      console.error('[ErrorBoundary] Error while logging error:', e);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-red-600">Unexpected Application Error</h2>
          <p className="mt-2 text-sm text-muted-foreground">{this.state.error?.message}</p>
          <details className="mt-4 whitespace-pre-wrap">
            <summary className="cursor-pointer text-sm text-blue-600">Show debug info</summary>
            <pre className="text-xs mt-2">Check console for further details (React.version and stack)</pre>
          </details>
        </div>
      );
    }

  return this.props.children as React.ReactNode;
  }
}

export default ErrorBoundary;
