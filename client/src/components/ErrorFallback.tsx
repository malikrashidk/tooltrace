import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";

export function ErrorFallback({ error, resetErrorBoundary }: { error: any; resetErrorBoundary: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                We've encountered an unexpected error. Our team has been notified and we're working on a fix.
            </p>
            <div className="bg-muted p-4 rounded-lg mb-8 text-left overflow-auto max-w-xl w-full">
                <p className="text-sm font-mono break-all">{error.message}</p>
            </div>
            <div className="flex gap-4">
                <Button onClick={resetErrorBoundary} variant="default">
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Try Again
                </Button>
                <Button onClick={() => (window.location.href = "/")} variant="outline">
                    Back to Dashboard
                </Button>
            </div>
        </div>
    );
}
