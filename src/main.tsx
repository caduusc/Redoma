import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import { logError } from './lib/errorLogger';

const rootElement = document.getElementById('root');

if (!rootElement) {
  const err = new Error('Could not find root element to mount to');

  // loga erro crítico de bootstrap
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

/**
 * Captura erros globais de runtime
 */
window.addEventListener('error', (event) => {
  logError({
    source: 'frontend',
    environment: 'prod',
    error_message: event.message || 'window.error',
    error_stack: event.error?.stack,
    route: window.location.pathname,
    extra_context: {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    },
  });
});

/**
 * Captura promises rejeitadas não tratadas
 */
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  const err = event.reason;

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
