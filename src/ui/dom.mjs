// Tiny DOM helper shared by the UI modules.
/** h('div', { class: 'x', 'aria-label': 'y' }, child, 'text') */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...children);
  return el;
}

/** Set text only when it changed, so per-frame updates do not churn the DOM. */
export function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}
