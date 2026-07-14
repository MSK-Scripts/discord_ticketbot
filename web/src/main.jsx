import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Fonts bundled locally (no external CDN — the dashboard's CSP forbids it). Same
// @fontsource families the MSK brand uses elsewhere. Only the weights actually
// used are imported, so the payload stays small.
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import '@fontsource/syne/600.css';
import '@fontsource/syne/700.css';
import '@fontsource/syne/800.css';

import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
