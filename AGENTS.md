# AGENTS.md — memorai

## Architecture

- **Zero build step** — vanilla JS, no bundler, no npm, no `package.json`
- **Live dev:** `python3 -m http.server 8080`
- All JS files are IIFEs that attach to `window.App` namespace
- **JS load order is critical** (each file depends on the previous):
  `state → utils → icons → storage → notes → sync → image → ui → app`
- State is mutable: `App.state.notes`, `App.state.settings`, `App.state.activeNoteId`, etc.
- DOM refs cached at startup: `App.dom.sidebar`, `App.dom.noteTitle`, etc.
- Version number in ONE place: `App.VERSION` in `js/state.js`

## Key subsystems

### Icons (`js/icons.js`)
- 147 Lucide icons embedded as SVG path strings in `App.iconsData`
- `App.refreshIcons(container)` replaces `<i data-lucide="name">` with real SVGs — call after any innerHTML change
- Icons in notes via `:icon-name:` shortcode, processed by `App.processIconShortcodes()`
- SVG elements get `aria-hidden="true"` and copy the original element's `class` and `id`

### Themes (`css/style.css`)
- 12 themes defined via `[data-theme="name"]` CSS selectors
- Each theme sets `--bg`, `--text`, `--accent`, etc. as CSS custom properties
- Theme toggle flips `-dark`/`-light` suffix; dropdown in Settings sets exact theme

### Sync (`js/sync.js`)
- GitHub Contents API (`api.github.com/repos/:owner/:repo/contents`)
- Notes as `.md` with YAML frontmatter (`App.noteToMD` / `App.mdToNote`)
- Images as separate files in `images/` directory
- On push: PUTs local notes, DELETEs remote notes not in local set, pushes pending images
- On pull: list + fetch, merge by ID (newer `updatedAt` wins)
- `App.oneTimeMigration()` converts legacy base64 images on first push

### Settings & Config
- `config.json` (optional, gitignored) overrides `githubToken`, `repo`, `branch`, `url`, `title`, `description`
- When config has values, corresponding Settings fields are disabled with "Managed by server config" hint
- User preferences (theme, timeFormat, noteDisplay, sortBy) are never in config — localStorage only
- `config.example.json` is the safe-to-commit template

### Favicon & Images
- Favicon: `favicon.ico` (multi-res) + `favicon-16/32/64/192/512.png` + `favicon.svg`
- OG image: `og-image.svg` → rendered to `og-image.png` via macOS `sips` (not qlmanage — it squashes)
- All generated via embedded Python scripts (no Pillow, no external deps)
- Image insertion in editor: resized to max 1200px, stored as `images/YYYYMMDD-HHMMSS.png` refs

### Service Worker (`sw.js`)
- Cache name: `memorai-v1`
- Caches app origin + `cdn.jsdelivr.net` + `fonts.googleapis.com` + `fonts.gstatic.com`
- Explicitly excludes `api.github.com` (sync API) to avoid stale data
- `activate` handler purges old caches

## Common pitfalls

- **HTML div balance** — the editor toolbar, formatting toolbar, settings modal, and note list are deeply nested. After any HTML change, verify with `grep -c '<div' index.html` vs `grep -c '</div>' index.html`
- **After innerHTML changes** — always call `App.refreshIcons(container)` or icons won't render
- **Event handlers on replaced elements** — `refreshIcons()` replaces `<i>` with `<svg>`. Handlers should be on parent buttons, not on the `<i>` elements
- **`marked` version** — CDN loads v15 which has `sanitize` option but it strips table elements. XSS protection uses DOMPurify in `switchToPreview()` instead.
- **localStorage writes** — wrapped in try/catch; quota exceeded silently toasts
- **`App.state.settings` mutation** — always call `App.saveSettings()` after changing, and check `dom.*.disabled` before reading field values (server config locks fields)
