import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { ErrorBoundary } from "react-error-boundary";
import App from "./App";
import { ErrorFallback } from "./components/ErrorFallback";
import "./index.css";

// Initialize Sentry for client-side error tracking
if (import.meta.env.PROD) {
    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration(),
        ],
        // Performance Monitoring
        tracesSampleRate: 0.1,
        // Session Replay
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        environment: "production",
    });
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find root element");

createRoot(rootElement).render(
    <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => {
            // Reset the state of your app so the error doesn't happen again
            window.location.reload();
        }}
    >
        <App />
    </ErrorBoundary>
);



