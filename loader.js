/**
 * PromptEngine Loader
 * 
 * Reads platforms/registry.json → fetches each platform config →
 * fetches each SVG icon → renders dock icons + modal behavior.
 * 
 * To add a platform:
 *   1. Add an SVG to /icons/
 *   2. Add a JSON config to /platforms/
 *   3. Add the id to registry.json
 *   Done. No UI code changes.
 */

const BASE = '';  // Relative path base. Change if hosted in a subdirectory.

// ============================================================
// STATE
// ============================================================
let platforms = [];       // Loaded platform configs
let iconCache = {};       // id → SVG markup string
let activePlatform = null;

// ============================================================
// LOAD
// ============================================================
async function loadRegistry() {
  try {
    const res = await fetch(`${BASE}platforms/registry.json`);
    if (!res.ok) throw new Error(`Registry fetch failed: ${res.status}`);
    const data = await res.json();
    return data.platforms || [];
  } catch (e) {
    console.error('[Loader] Registry load failed:', e);
    return [];
  }
}

async function loadPlatform(id) {
  try {
    const res = await fetch(`${BASE}platforms/${id}.json`);
    if (!res.ok) throw new Error(`Platform ${id} fetch failed: ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(`[Loader] Failed to load platform ${id}:`, e);
    return null;
  }
}

async function loadIcon(path) {
  try {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) throw new Error(`Icon fetch failed: ${res.status}`);
    return await res.text();
  } catch (e) {
    console.error(`[Loader] Failed to load icon ${path}:`, e);
    // Fallback: colored circle
    return '<svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#555"/></svg>';
  }
}

async function init() {
  const registry = await loadRegistry();
  if (!registry.length) {
    console.error('[Loader] No platforms in registry');
    showError('No platforms configured');
    return;
  }

  // Load brand icon
  const brandSvg = await loadIcon('icons/promptengine.svg');
  const brandEl = document.getElementById('dock-brand-icon');
  if (brandEl) brandEl.innerHTML = brandSvg;

  // Load all platforms in parallel
  const configs = await Promise.all(registry.map(id => loadPlatform(id)));
  platforms = configs.filter(Boolean);

  // Load all icons in parallel
  const iconResults = await Promise.all(
    platforms.map(p => loadIcon(p.icon).then(svg => ({ id: p.id, svg })))
  );
  iconResults.forEach(r => { iconCache[r.id] = r.svg; });

  // Render dock
  renderDock();

  // Update hero count
  const countEl = document.getElementById('hero-count');
  if (countEl) countEl.textContent = platforms.length;
}

// ============================================================
// RENDER DOCK
// ============================================================
function renderDock() {
  const container = document.getElementById('dock-platforms');
  if (!container) return;
  container.innerHTML = '';

  platforms.forEach(p => {
    const el = document.createElement('div');
    el.className = 'di';
    el.setAttribute('data-platform', p.id);
    el.style.setProperty('--p-color', p.color);
    el.onclick = () => openModal(p.id);

    el.innerHTML = `
      <div class="di-icon">${iconCache[p.id] || ''}</div>
      <div class="di-dot" style="background:${p.color}"></div>
      <div class="di-tip">
        <div class="di-tip-name">${esc(p.name)}</div>
        <div class="di-tip-role">${esc(p.role)}</div>
      </div>
    `;

    container.appendChild(el);
  });
}

// ============================================================
// MODAL
// ============================================================
function openModal(id) {
  const p = platforms.find(x => x.id === id);
  if (!p) return;
  activePlatform = p;

  const modal = document.getElementById('modal');
  const icon = document.getElementById('m-icon');
  const title = document.getElementById('m-title');
  const body = document.getElementById('m-body');
  const foot = document.getElementById('m-foot');

  // Header
  icon.innerHTML = iconCache[p.id] || '';
  icon.style.background = hexToRgba(p.color, 0.1);
  icon.style.borderColor = hexToRgba(p.color, 0.2);
  title.textContent = p.name;

  // Syntax-highlighted prompt
  const hl = highlightPrompt(p.prompt);

  body.innerHTML = `
    <div class="lbl">System Prompt</div>
    <div class="syb" style="border-left-color:${p.color}">${hl}</div>
    <div class="lbl">Additional Context <span class="lbl-opt">(optional)</span></div>
    <textarea class="edt" id="m-extra" placeholder="Project details, constraints, additional instructions..."></textarea>
    <div class="sts">
      <div class="st"><div class="st-v">${p.prompt.split('\n').length}</div><div class="st-l">Lines</div></div>
      <div class="st"><div class="st-v">${p.prompt.length}</div><div class="st-l">Chars</div></div>
      <div class="st"><div class="st-v" style="color:${p.color}">●</div><div class="st-l">Ready</div></div>
    </div>
  `;

  // Footer buttons
  let buttons = `
    <button class="btn btn-t" onclick="closeModal()">Cancel</button>
    <button class="btn btn-s" onclick="copyPrompt()">Copy Prompt</button>
  `;
  if (p.url) {
    buttons += `<button class="btn btn-p" onclick="launchPlatform()">Open ${esc(p.name)} →</button>`;
  }
  foot.innerHTML = buttons;

  modal.classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  activePlatform = null;
}

function copyPrompt() {
  if (!activePlatform) return;
  let text = activePlatform.prompt;
  const extra = document.getElementById('m-extra');
  if (extra && extra.value.trim()) {
    text += '\n\nADDITIONAL CONTEXT:\n' + extra.value.trim();
  }
  navigator.clipboard.writeText(text)
    .then(() => toast('Copied to clipboard'))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast('Copied');
    });
}

function launchPlatform() {
  if (!activePlatform || !activePlatform.url) return;
  copyPrompt();
  setTimeout(() => window.open(activePlatform.url, '_blank'), 250);
}

// ============================================================
// UTILITIES
// ============================================================
function highlightPrompt(text) {
  return esc(text)
    .replace(/^(SYSTEM MODE:.*)/gm, '<span class="h">$1</span>')
    .replace(/^(RULES|WORKFLOW|OUTPUT FORMAT|ADDITIONAL CONTEXT)/gm, '<span class="h">$1</span>')
    .replace(/^(\d+\.)/gm, '<span class="n">$1</span>')
    .replace(/^(- )/gm, '<span class="k">- </span>');
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

function showError(msg) {
  const hero = document.querySelector('.hero-sub');
  if (hero) hero.textContent = msg;
}

// ============================================================
// KEYBOARD
// ============================================================
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', init);
