// Search box (R6.3): `/` focuses it, results filter as you type, Enter or click flies to the result,
// Escape closes. Fully keyboard operable (arrow keys move the highlighted option).
import { matchItems } from './search-match.mjs';
import { injectBaseStyle } from './base-style.mjs';

export function createSearch({ items, onPick }) {
  injectBaseStyle();
  const root = document.createElement('div');
  root.className = 'hud'; root.style.cssText = 'left:12px;top:12px;width:260px';
  const input = document.createElement('input');
  input.type = 'search'; input.placeholder = 'Search ( / )'; input.autocomplete = 'off'; input.style.width = '100%'; input.style.boxSizing = 'border-box';
  input.setAttribute('role', 'combobox'); input.setAttribute('aria-label', 'Search satellites, antennas and facilities');
  input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-controls', 'search-results');
  const list = document.createElement('ul');
  list.id = 'search-results'; list.setAttribute('role', 'listbox'); list.hidden = true;
  root.append(input, list);
  document.body.appendChild(root);

  let hits = [], active = 0;
  function render() {
    list.replaceChildren();
    hits.forEach((h, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(i === active));
      li.textContent = h.label;
      const k = document.createElement('small'); k.textContent = h.kind; li.append(k);
      li.addEventListener('mousedown', (e) => { e.preventDefault(); pick(h); });
      list.append(li);
    });
    list.hidden = hits.length === 0;
    input.setAttribute('aria-expanded', String(hits.length > 0));
  }
  function close() { hits = []; active = 0; input.value = ''; render(); input.blur(); }
  function pick(h) { onPick(h); close(); }

  input.addEventListener('input', () => { hits = matchItems(items(), input.value); active = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    else if (e.key === 'ArrowDown' && hits.length) { e.preventDefault(); active = (active + 1) % hits.length; render(); }
    else if (e.key === 'ArrowUp' && hits.length) { e.preventDefault(); active = (active - 1 + hits.length) % hits.length; render(); }
    else if (e.key === 'Enter' && hits[active]) { e.preventDefault(); pick(hits[active]); }
  });
  addEventListener('keydown', (e) => {
    const t = e.target;
    const typing = t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
    if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); input.focus(); input.select(); }
  });
  return { root, input, close };
}
