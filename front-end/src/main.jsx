import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initFaro } from './observability/faro';
import './styles/tokens.css';
import './styles/reset.css';
import './styles/global.css';
import App from './App.jsx';

initFaro({
  url: (import.meta.env.VITE_FARO_URL || '/otlp/v1/traces'),
  appName: 'gep-scm-web',
  appVersion: import.meta.env.VITE_APP_VERSION || '0.1.0',
  environment: import.meta.env.MODE || 'dev',
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
