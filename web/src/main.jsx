import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Fonts bundled locally (no external CDN, the dashboard's CSP forbids it), the
// same @fontsource-variable families as msk-scripts.de: Archivo for headings,
// Source Sans 3 for everything else. Monospace is the system stack.
import '@fontsource-variable/archivo/standard.css';
import '@fontsource-variable/source-sans-3';

import App from './App.jsx';
import './index.css';
import { loadAndApplyDashboardSettings } from './settings.js';
import { I18nProvider } from './i18n.jsx';

function render() {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>,
  );
}

// Apply the accent/favicon BEFORE the first render so there is no flash of the
// default theme. Best-effort and fast (a tiny same-origin JSON): if it fails or
// is slow, we still render with the built-in defaults.
loadAndApplyDashboardSettings().finally(render);
