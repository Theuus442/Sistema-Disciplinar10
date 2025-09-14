import React from "react";
import { errorMessage } from "@/lib/utils";

type Props = { children: React.ReactNode };

type State = { hasError: boolean; error?: any };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // Could hook Sentry here if connected
    // console.error("ErrorBoundary caught: ", error, info);
  }

  handleReload = () => {
    try {
      if (typeof window !== "undefined") window.location.reload();
    } catch {}
  };

  render() {
    if (this.state.hasError) {
      const msg = errorMessage(this.state.error);
      return (
        <div className="min-h-screen bg-sis-bg-light text-sis-dark-text flex items-center justify-center p-6">
          <div className="w-full max-w-xl rounded-md border border-sis-border bg-white p-6 shadow">
            <h1 className="font-open-sans text-2xl font-bold mb-2">Ocorreu um erro inesperado</h1>
            <p className="font-roboto text-sm text-sis-secondary-text mb-4">Tente recarregar a página. Se o problema persistir, informe o administrador.</p>
            <div className="mb-4 rounded bg-gray-50 p-3 text-xs break-words">
              {msg}
            </div>
            <details className="text-xs text-sis-secondary-text whitespace-pre-wrap">
              <summary>Detalhes técnicos</summary>
              {String(this.state.error?.stack || this.state.error)}
            </details>
            <div className="mt-4">
              <button onClick={this.handleReload} className="px-3 py-2 rounded bg-sis-blue text-white">Recarregar</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}
