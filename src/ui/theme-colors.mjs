// Canvas drawing cannot use CSS variables directly, so read the active theme's tokens once per draw.
const FALLBACK = { ink: '#17202b', ink2: '#4b5665', ink3: '#788496', hair2: 'rgba(23,32,43,.16)', accent: '#1673d6', ok: '#17a06b', warn: '#d98a05', bad: '#e5484d', strong: '#fdfcfa' };
const VARS = { ink: '--ink', ink2: '--ink-2', ink3: '--ink-3', hair2: '--hair-2', accent: '--accent', ok: '--ok', warn: '--warn', bad: '--bad', strong: '--glass-strong' };

export function themeColors() {
  try {
    const cs = getComputedStyle(document.documentElement);
    const out = { dark: document.documentElement.dataset.theme === 'dark' };
    for (const [k, v] of Object.entries(VARS)) out[k] = cs.getPropertyValue(v).trim() || FALLBACK[k];
    return out;
  } catch { return { ...FALLBACK, dark: false }; }
}
