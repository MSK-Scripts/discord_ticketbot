/**
 * Pure translation-lookup logic, kept apart from i18n.jsx.
 *
 * i18n.jsx cannot be imported outside a bundler (it uses `import.meta.glob` and
 * JSX), so the rules that are actually easy to get wrong live here instead, where
 * the Node test suite can exercise them directly.
 */

/**
 * Resolve a dotted path, where a KEY MAY ITSELF CONTAIN DOTS.
 *
 * That case is real, not hypothetical: permission ids are `tickets.view`,
 * `access.manage` and so on, so `permissions.tickets.view` has to find
 * `{ permissions: { "tickets.view": … } }`. Splitting naively on every dot walks to
 * `permissions.tickets`, finds nothing, and every permission label silently falls
 * back to English.
 *
 * So: try the whole remaining path as a literal key first, then split at each dot
 * in turn and recurse.
 *
 * @returns {string|undefined} undefined for a missing key or a non-string value.
 */
export function lookup(bundle, path) {
  if (bundle == null || typeof bundle !== 'object') return undefined;

  const direct = bundle[path];
  if (typeof direct === 'string') return direct;

  for (let cut = path.indexOf('.'); cut !== -1; cut = path.indexOf('.', cut + 1)) {
    const child = bundle[path.slice(0, cut)];
    if (child && typeof child === 'object') {
      const found = lookup(child, path.slice(cut + 1));
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/**
 * Replace {name} placeholders. An unknown placeholder is left in the output rather
 * than blanked, so a wrong variable name is visible instead of quietly vanishing.
 */
export function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (whole, key) =>
    (vars[key] === undefined || vars[key] === null ? whole : String(vars[key])));
}

/**
 * Full resolution: chosen language, then the fallback bundle, then the key itself.
 * Showing the key (`stats.title`) beats showing nothing, because it names the
 * missing entry.
 */
export function resolve(bundles, lang, fallbackLang, path, vars) {
  const raw = lookup(bundles?.[lang], path)
    ?? lookup(bundles?.[fallbackLang], path)
    ?? path;
  return interpolate(raw, vars);
}
