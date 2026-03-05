import { useAuth } from '@/contexts/AuthContext';
import { WifiOff, X, RefreshCw } from 'lucide-react';

export function NetworkErrorBanner() {
    const { networkError, clearNetworkError } = useAuth();

    if (!networkError) return null;

    const handleRetry = () => {
        clearNetworkError();
        window.location.reload();
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-3 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <WifiOff className="h-5 w-5 flex-shrink-0" />
                    <div>
                        <p className="font-medium">
                            Problema de conexão detectado
                        </p>
                        <p className="text-sm text-amber-100">
                            Não foi possível conectar ao servidor. Verifique sua internet ou tente novamente.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRetry}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-md text-sm font-medium transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Tentar novamente
                    </button>
                    <button
                        onClick={clearNetworkError}
                        className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
                        aria-label="Fechar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
