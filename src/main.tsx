import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import { logError } from '../lib/errorLogger';

const rootElement = document.getElementById('root');

if (!rootElement) {
  const err = new Error('Could not find root element to mount to');

  logError({
    source: 'frontend',
    environment: 'prod',
    error_message: err.message,
    error_stack: err.stack,
    route: window.location.pathname,
    extra_context: { phase: 'bootstrap' },
  });

  throw err;
}

window.addEventListener('error', (event) => {
  logError({
    source: 'frontend',
    environment: 'prod',
    error_message: event.message || 'window.error',
    error_stack: (event as any).error?.stack,
    route: window.location.pathname,
    extra_context: {
      filename: (event as any).filename,
      lineno: (event as any).lineno,
      colno: (event as any).colno,
    },
  });
});

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  const err: any = event.reason;

  logError({
    source: 'frontend',
    environment: 'prod',
    error_message: err?.message || String(err) || 'unhandledrejection',
    error_stack: err?.stack,
    route: window.location.pathname,
  });
});

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
