import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

const isChunkLoadError = (error: Error | null): boolean => {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const name = (error.name || '').toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes("cannot read properties of undefined (reading 'default')") ||
    msg.includes("reading 'default'") ||
    msg.includes('module has no default export') ||
    msg.includes('no default export') ||
    msg.includes('returned undefined') ||
    msg.includes('chunkloaderror') ||
    msg.includes('lazywithretry') ||
    msg.includes('unexpected token') ||
    msg.includes('loading chunk') ||
    name.includes('chunkloaderror')
  );
};

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      isChunkError: isChunkLoadError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);

    // If an asset hash changed due to a new deploy, auto-reload IMMEDIATELY without making user wait
    if (isChunkLoadError(error)) {
      const reloadKey = 'chunk_reload_auto';
      let lastReload = 0;
      try {
        lastReload = Number(sessionStorage.getItem(reloadKey) || '0');
      } catch {}
      const now = Date.now();

      if (now - lastReload > 8000) {
        try {
          sessionStorage.setItem(reloadKey, String(now));
        } catch {}
        // Auto-refresh seamlessly to the newest deployed version
        window.location.reload();
      }
    }
  }

  handleRetry = () => {
    if (this.state.isChunkError || isChunkLoadError(this.state.error)) {
      try {
        sessionStorage.removeItem('chunk_reload_auto');
      } catch {}
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null, isChunkError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isChunk = this.state.isChunkError;

      if (isChunk) {
        return (
          <div className="min-h-[220px] flex flex-col items-center justify-center gap-4 p-8 text-center animate-fade-in">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 animate-spin">
              <RefreshCw className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-lg font-bold text-foreground">
                নতুন ভার্সন আপডেট নেওয়া হচ্ছে…
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                সিস্টেমের নতুন আপডেট ইন্সটল হয়েছে। পেজটি স্বয়ংক্রিয়ভাবে লোড হচ্ছে।
              </p>
            </div>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-md hover:bg-emerald-700 transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              পেজ রিফ্রেশ করুন
            </button>
          </div>
        );
      }

      return (
        <div className="min-h-[220px] flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="p-3 rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-lg font-bold text-foreground">
              কিছু একটা সমস্যা হয়েছে
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md hover:bg-primary/90 transition-all active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            আবার চেষ্টা করুন
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
