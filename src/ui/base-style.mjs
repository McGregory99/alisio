// Shared look of the small HUD controls and a visible keyboard focus ring (R6.6).
let done = false;
export function injectBaseStyle() {
  if (done) return;
  done = true;
  const s = document.createElement('style');
  s.textContent = `
.hud{position:fixed;z-index:12;font:13px system-ui,sans-serif;color:#e8eef7}
.hud input,.hud button,.hud select{font:inherit;color:#e8eef7;background:rgba(12,18,28,.8);border:1px solid rgba(159,208,255,.25);border-radius:8px;padding:6px 10px}
.hud button{cursor:pointer}
.hud button[aria-pressed="true"]{background:#2f6fbf;border-color:#9fd0ff}
.hud :focus-visible{outline:2px solid #ffe28a;outline-offset:2px}
.hud ul{list-style:none;margin:4px 0 0;padding:4px;border-radius:8px;background:rgba(12,18,28,.92)}
.hud li{padding:5px 8px;border-radius:6px;cursor:pointer}
.hud li[aria-selected="true"]{background:#2f6fbf}
.hud small{opacity:.7;margin-left:6px}`;
  document.head.appendChild(s);
}
