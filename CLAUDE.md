# CLAUDE.md — PromptEngine Design System Rules

## 1. Token Definitions

Design tokens are defined as CSS custom properties in `launcher.html` `:root`:

```css
:root {
  /* Surfaces */
  --bg: #09090b;
  --panel: #111114;
  --card: #18181d;
  --card-h: #1e1e26;

  /* Borders */
  --bdr: #24242e;
  --bdr-h: #343440;

  /* Brand — Gold */
  --gold: #F5B800;
  --gold-soft: #ffd866;
  --gold-dim: #9e7600;
  --gold-g: rgba(245,184,0,.06);
  --gold-g2: rgba(245,184,0,.20);

  /* Text hierarchy */
  --tx: #e8e8ef;    /* primary */
  --tx2: #94949e;   /* secondary */
  --tx3: #5a5a66;   /* muted */

  /* Radii */
  --r: 14px;        /* cards, modals */
  --rs: 8px;        /* buttons, inputs */
}
```

**Platform colors** are defined per-platform in JSON configs (`/platforms/*.json`):
```
Claude:   #D97757
ChatGPT:  #10A37F
Gemini:   #4285F4
Cursor:   #9D5CFF
DeepSeek: #4D6BFE
Ollama:   #a0a0ad
```

**No token transformation system.** Raw CSS variables consumed directly.

## 2. Component Library

**Architecture:** Config-driven. Zero hardcoded UI components.

| Component | Source | Rendered By |
|-----------|--------|-------------|
| Dock icon | `/platforms/*.json` + `/icons/*.svg` | `loader.js → renderDock()` |
| Tooltip | Generated in `renderDock()` | Hover CSS |
| Modal | Static shell in `launcher.html` | `loader.js → openModal()` |
| System prompt block | `.syb` class | `openModal()` with syntax highlighting |
| Editor textarea | `.edt` class | Static HTML |
| Stats row | `.sts > .st` | `openModal()` |
| Buttons | `.btn .btn-p / .btn-s / .btn-t` | `openModal()` |
| Toast | `.toast` | `toast()` function |

**No component framework.** Vanilla JS + DOM manipulation.
**No storybook.** Single-page app.

## 3. Frameworks & Libraries

- **UI Framework:** None (vanilla HTML/CSS/JS)
- **Styling:** CSS custom properties, no preprocessor
- **Fonts:** Google Fonts CDN
  - Display: `DM Sans` (300–700)
  - Mono: `JetBrains Mono` (400, 500)
- **Build system:** None. Static files served via GitHub Pages
- **Bundler:** None. Single HTML + single JS file

## 4. Asset Management

- **Icons:** Inline SVG stored in `/icons/*.svg`
- **No images, videos, or raster assets**
- **CDN:** Google Fonts only
- **No optimization pipeline** — SVGs are hand-optimized, minimal nodes

## 5. Icon System

**Location:** `/icons/`

**Files:**
```
icons/
├── promptengine.svg   ← brand bolt (gradient fill)
├── claude.svg         ← Anthropic mark (stroke)
├── chatgpt.svg        ← OpenAI geometry (stroke)
├── gemini.svg         ← Google dual-arc (multi-color stroke + fill)
├── cursor.svg         ← terminal prompt (stroke)
├── deepseek.svg       ← double chevron (stroke)
└── ollama.svg         ← compute gauge (stroke)
```

**Convention:**
- Filename matches platform `id` in JSON config
- All icons: `width="24" height="24" viewBox="0 0 24 24"`
- Stroke-based design, 1.2–2px weight
- Outer shape at 25% opacity, inner detail at full
- Platform color as stroke/fill color
- Referenced in config as `"icon": "icons/{id}.svg"`

**Usage:** `loader.js` fetches SVG text via `fetch()`, injects as `innerHTML`

**Adding a new icon:**
1. Create `icons/{name}.svg` following the 24px grid
2. Reference it in `platforms/{name}.json` as `"icon": "icons/{name}.svg"`

## 6. Styling Approach

**Methodology:** Flat CSS with short class names. No BEM, no modules.

**Class naming pattern:**
- Dock: `.dock`, `.di`, `.di-icon`, `.di-dot`, `.di-tip`
- Modal: `.mbg`, `.mbox`, `.mhdr`, `.mbody`, `.mfoot`
- Typography: `.lbl`, `.syb`, `.edt`
- Layout: `.center`, `.hero`
- Buttons: `.btn`, `.btn-p` (primary), `.btn-s` (secondary), `.btn-t` (tertiary)

**Global styles:** All in `<style>` within `launcher.html`

**Responsive:** Minimal — max-width constraints on modal (`94vw`, `88vh`). Dock is fixed-position left. No breakpoints currently defined.

**Animations:**
```css
/* Modal fade */
@keyframes mf { from{opacity:0} to{opacity:1} }
/* Modal scale */
@keyframes ms { from{transform:scale(.96);opacity:0} to{transform:scale(1);opacity:1} }
```

**Hover patterns:**
- Dock icons: `scale(1.12)` + border color shift to platform color at 40%
- Tooltips: `opacity 0→1` + `translateX(-4px → 0)`
- Buttons: `translateY(-1px)` + gold box-shadow

## 7. Project Structure

```
promptbridge/                  ← GitHub Pages root
├── icons/                     ← SVG icons (one per platform + brand)
│   ├── promptengine.svg
│   ├── claude.svg
│   ├── chatgpt.svg
│   ├── gemini.svg
│   ├── cursor.svg
│   ├── deepseek.svg
│   └── ollama.svg
├── platforms/                 ← Platform configs (JSON)
│   ├── registry.json          ← Load order array
│   ├── claude.json
│   ├── chatgpt.json
│   ├── gemini.json
│   ├── cursor.json
│   ├── deepseek.json
│   └── ollama.json
├── loader.js                  ← Runtime: reads registry → fetches configs → renders UI
└── index.html                 ← UI shell (no hardcoded platform data)
```

**Adding a new platform requires:**
1. `icons/{id}.svg` — 24px grid SVG
2. `platforms/{id}.json` — config with name, color, url, role, prompt
3. Add `"{id}"` to `platforms/registry.json` → `platforms` array

**No other files need editing.**

## 8. Figma-to-Code Mapping Rules

When converting a Figma design to this codebase:

- **Background fills** → map to `--bg`, `--panel`, or `--card`
- **Border colors** → `--bdr` (default) or `--bdr-h` (hover)
- **Text colors** → `--tx` (primary), `--tx2` (secondary), `--tx3` (muted)
- **Accent color** → `--gold` (brand), or platform color from JSON
- **Border radius** → `--r` (14px for containers) or `--rs` (8px for controls)
- **Font stacks** → `'DM Sans'` for UI, `'JetBrains Mono'` for code/data
- **Font weights** → 700 headings, 600 labels, 400 body
- **Font sizes** → 28px hero, 14px titles, 12-13px body, 10-11px labels, 8-9px micro
- **Spacing** → 20px panel padding, 16px card padding, 10px between elements, 4px dock gap
- **Icons** → Always stroke-based SVG at 24×24 viewBox, loaded from `/icons/`
- **Shadows** → `box-shadow` only, no `filter: drop-shadow` except on dock dropdown
- **Transitions** → `cubic-bezier(.4,0,.2,1)` for transforms, `.15s` for colors/borders
