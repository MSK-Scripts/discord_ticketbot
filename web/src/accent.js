/**
 * Fits a customer's accent colour to both themes of the dashboard.
 *
 * The accent replaces MSK green wherever the shop uses it: the fill of the
 * main button and of "on" states, the label on that fill, the hovered fill,
 * green as text and border (links, the active menu item, check marks, the
 * focus ring), the soft surface behind the selected thing and the stripe
 * above the top bar. Any hex colour can be saved, so every role is computed
 * against the theme's surfaces and checked against WCAG 2.2 AA:
 *
 * - The label on the fill is black or white by WCAG relative luminance (the
 *   higher contrast wins), not by the old YIQ brightness, which picks white
 *   on a bright red that only reaches 4:1 with it.
 * - If no label reaches 4.5:1 with the fill, the fill moves away from the
 *   label (darker under white, lighter under black) until one does.
 * - The soft surface is a light tint of the accent; it gets paler until text
 *   and secondary text on it reach 4.5:1.
 * - As text and border the accent must reach 4.5:1 on the ground, the tile,
 *   a card and the soft surface. Where it does not, a darker variant is used
 *   in the light theme and a lighter one in the dark theme: a yellow accent
 *   keeps its yellow buttons and gets dark olive links, a navy accent gets
 *   light blue links on anthracite. The focus ring uses the same variant.
 *
 * A colour that already passes is used as it is. Variants change only the
 * HSL lightness, which keeps hue and saturation and changes the luminance
 * monotonically, so the search always ends.
 *
 * Pure functions without the DOM: tests/dashboard-accent.test.js checks the
 * rules for many colours in Node, and settings.js writes the result as CSS
 * custom properties (see the accent block in index.css).
 */

/** Theme surfaces the accent is measured against. A test keeps them equal to index.css. */
export const SURFACES = {
  light: {
    background: '#f6f6f4', card: '#ffffff', muted: '#ededea',
    foreground: '#1c1d1f', mutedForeground: '#5a5d61',
  },
  dark: {
    background: '#18191b', card: '#212225', muted: '#111214',
    foreground: '#ececea', mutedForeground: '#a7a9ad',
  },
};

/** The two label colours for a fill: white, and the near-black label of the shop's dark theme. */
export const LIGHT_LABEL = '#ffffff';
export const DARK_LABEL = '#0e150e';

/** WCAG 2.2 AA for text. Adjusted colours aim a little higher, as the shop does. */
export const AA_TEXT = 4.5;
const AIM = 4.6;

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** "#5eb131" | "#abc" → { r, g, b }, or null when it is not a hex colour. */
export function hexToRgb(hex) {
  if (typeof hex !== 'string' || !HEX_RE.test(hex.trim())) return null;
  let h = hex.trim().slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export const rgbToHex = ({ r, g, b }) =>
  `#${[r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;

/** Normalised #rrggbb in lower case, or null. */
export function normalizeHex(hex) {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHex(rgb) : null;
}

const channel = (v) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance of a hex colour. */
export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio of two hex colours, 1 to 21. */
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** `amount` of `toward` mixed into `color` in sRGB, as #rrggbb. */
export function mix(color, toward, amount) {
  const a = hexToRgb(color);
  const b = hexToRgb(toward);
  return rgbToHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  });
}

/** The label (white or near-black) with the higher WCAG contrast on `fill`. */
export function readableForeground(fill) {
  return contrast(LIGHT_LABEL, fill) >= contrast(DARK_LABEL, fill) ? LIGHT_LABEL : DARK_LABEL;
}

function rgbToHsl({ r, g, b }) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: h / 6, s, l };
}

function hslToRgb({ h, s, l }) {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return { r: hue(h + 1 / 3) * 255, g: hue(h) * 255, b: hue(h - 1 / 3) * 255 };
}

/**
 * Make `color` darker (toward '#000000') or lighter (toward '#ffffff') in 1 %
 * steps of HSL lightness until `ok` holds. Hue and saturation stay, so a navy
 * becomes a clear light blue rather than a washed-out grey, and luminance
 * changes monotonically, so the search ends at black or white at the latest.
 */
function shiftUntil(color, toward, ok) {
  const hsl = rgbToHsl(hexToRgb(color));
  const lighter = toward === '#ffffff';
  for (let i = 0; i <= 100; i++) {
    const l = lighter ? Math.min(1, hsl.l + i / 100) : Math.max(0, hsl.l - i / 100);
    const c = rgbToHex(hslToRgb({ ...hsl, l }));
    if (ok(c)) return c;
    if (l === (lighter ? 1 : 0)) break;
  }
  return toward;
}

const minContrast = (color, surfaces) => Math.min(...surfaces.map(s => contrast(color, s)));

/**
 * The accent roles for one theme. Returns null for anything that is not a hex
 * colour. `adjusted` says which roles had to leave the customer's colour.
 */
export function deriveAccent(hex, theme) {
  const base = normalizeHex(hex);
  const s = SURFACES[theme];
  if (!base || !s) return null;

  // Fill and its label.
  let label = readableForeground(base);
  let primary = base;
  if (contrast(label, primary) < AA_TEXT) {
    const away = label === LIGHT_LABEL ? '#000000' : '#ffffff';
    primary = shiftUntil(base, away, c => contrast(label, c) >= AIM);
    label = readableForeground(primary);
  }

  // Hovered fill: further from the label, so its contrast only grows.
  const away = label === LIGHT_LABEL ? '#000000' : '#ffffff';
  let primaryHover = mix(primary, away, 0.15);
  if (primaryHover === primary) {
    // Already black or white: hover toward the label instead, as far as AA allows.
    primaryHover = mix(primary, label, 0.15);
    if (contrast(label, primaryHover) < AA_TEXT) primaryHover = primary;
  }

  // Soft surface: a tint of the accent over the card (light) or the ground
  // (dark), paler until text and secondary text on it pass.
  const softBase = theme === 'light' ? s.card : s.background;
  let accentSoft = softBase;
  for (let p = 12; p >= 0; p--) {
    const c = mix(softBase, base, p / 100);
    if (contrast(s.foreground, c) >= AA_TEXT && contrast(s.mutedForeground, c) >= AA_TEXT) {
      accentSoft = c;
      break;
    }
  }

  // Accent as text, sign and border on every surface it sits on.
  const surfaces = [s.background, s.card, s.muted, accentSoft];
  let primaryText = base;
  if (minContrast(base, surfaces) < AA_TEXT) {
    const toward = theme === 'light' ? '#000000' : '#ffffff';
    primaryText = shiftUntil(base, toward, c => minContrast(c, surfaces) >= AIM);
  }

  return {
    primary,
    primaryForeground: label,
    primaryHover,
    primaryText,
    accentSoft,
    adjusted: { fill: primary !== base, text: primaryText !== base },
  };
}

/** CSS custom property name for a role and a theme, as index.css reads it. */
const ROLE_PROPERTY = {
  primary: 'primary',
  primaryForeground: 'primary-foreground',
  primaryHover: 'primary-hover',
  primaryText: 'primary-text',
  accentSoft: 'accent-soft',
};

export const ACCENT_PROPERTIES = ['light', 'dark'].flatMap(theme =>
  Object.values(ROLE_PROPERTY).map(p => `--accent-${theme}-${p}`));

/** { '--accent-light-primary': '#…', … } for both themes, or null for an invalid colour. */
export function accentProperties(hex) {
  const out = {};
  for (const theme of ['light', 'dark']) {
    const roles = deriveAccent(hex, theme);
    if (!roles) return null;
    for (const [role, prop] of Object.entries(ROLE_PROPERTY)) out[`--accent-${theme}-${prop}`] = roles[role];
  }
  return out;
}
