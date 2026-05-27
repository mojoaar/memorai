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
- Current version: **0.1.9**; SW cache: **memorai-v0.1.9**

## Key subsystems

### Icons (`js/icons.js`)
- **277 Lucide icons** embedded as SVG path strings in `App.iconsData`
- `App.refreshIcons(container)` replaces `<i data-lucide="name">` with real SVGs — call after any innerHTML change
- Icons in notes via `:icon-name:` shortcode, processed by `App.processIconShortcodes()`
- SVG elements get `aria-hidden="true"` and copy the original element's `class` and `id`

### Themes (`css/style.css`)
- **13 theme families, 22 CSS blocks** defined via `[data-theme="name"]` CSS selectors
- Each theme sets `--bg`, `--text`, `--accent`, etc. as CSS custom properties
- **Catppuccin** has 4 individual palettes (no `-dark`/`-light` suffix): `catppuccin-latte`, `catppuccin-frappe`, `catppuccin-macchiato`, `catppuccin-mocha`
- **Other 9 families** each have a `-dark` and `-light` variant: `ayu`, `cyberpunk`, `dracula`, `github`, `gruvbox`, `night-owl`, `nord`, `one`, `tokyo-night`
- `App.LIGHT_THEMES` in `state.js` is the single source of truth for light/dark detection — includes all `-light` variants plus `catppuccin-latte`
- **Default theme:** `catppuccin-macchiato`
- **Theme dropdown** shows one entry per family (flat list, alphabetical). Value is the family name for non-Catppuccin themes (e.g. `dracula`), full ID for Catppuccin palettes
- `App.themeToDropdownValue(theme)` in `ui.js` maps a full theme ID to its dropdown value — used when syncing the dropdown to the current theme
- **Toggle behaviour:** Catppuccin darks (Frappé/Macchiato/Mocha) → Latte; Latte → Mocha; all others swap `-dark`/`-light` suffix
- **Switching families** preserves dark/light preference — the change handler reads the current theme from `state.settings.theme`, checks `App.LIGHT_THEMES`, then applies `family + '-dark'` or `family + '-light'` accordingly
- `App.setTheme(fullId)` stores the full theme ID, applies `data-theme`, syncs the dropdown via `themeToDropdownValue`, updates the icon, and saves settings

### Sync (`js/sync.js`)
- GitHub Contents API (`api.github.com/repos/:owner/:repo/contents`)
- Notes as `.md` with YAML frontmatter (`App.noteToMD` / `App.mdToNote`)
- Images as separate files in `images/` directory
- **On push:**
  1. Fetches full remote note listing upfront to build a SHA map (`remoteSHAs`)
  2. PUTs each local note — uses `remoteSHAs[note.id]` first (always current), falls back to `note._sha` (stale). This prevents both "sha wasn't supplied" (422) and "does not match" (409) errors
  3. Reuses the same listing to DELETE remote notes not present locally
  4. Pushes pending images
- **On pull:** list + fetch, merge by ID (newer `updatedAt` wins), stores `_sha` from each fetched file
- `App.handleSync()` pulls first (merges remote into local), then pushes the merged state — repo is the source of truth, preventing multi-device deletion
- `App.silentPull()` — background pull with silent error handling, used on app load
- `App.oneTimeMigration()` converts legacy base64 images on first push

### Toasts (`js/utils.js`)
- `App.toast(message, type)` — type is `'success'`, `'error'`, or `'info'`
- **Success/info** toasts auto-dismiss after **3 seconds**
- **Error** toasts auto-dismiss after **8 seconds** and include a **copy button** (inline SVG, no icon system dependency) that copies the full message to clipboard; icon briefly flips to a checkmark on success

### Settings & Config
- `config.json` (optional, gitignored) overrides `githubToken`, `repo`, `branch`, `url`, `title`, `description`
- When config has values, corresponding Settings fields are disabled with "Managed by server config" hint
- User preferences (theme, timeFormat, noteDisplay, sortBy, codeLineNumbers) are never in config — localStorage only
- `config.example.json` is the safe-to-commit template
- GitHub fields grouped in a `.github-settings` card; inline connection validation via `validateGithubBtn` / `githubStatus`

### Favicon & Images
- Favicon: `favicon.ico` (multi-res) + `favicon-16/32/64/192/512.png` + `favicon.svg`
- OG image: `og-image.svg` → rendered to `og-image.png` via macOS `sips` (not qlmanage — it squashes)
- All generated via embedded Python scripts (no Pillow, no external deps)
- Image insertion in editor: resized to max 1200px, stored as `images/YYYYMMDD-HHMMSS.png` refs

### Service Worker (`sw.js`)
- Cache name: `memorai-v0.1.9` — bump on every release
- Caches app origin + `cdn.jsdelivr.net` + `fonts.googleapis.com` + `fonts.gstatic.com`
- Explicitly excludes `api.github.com` (sync API) to avoid stale data
- `activate` handler purges old caches; `skipWaiting` + `clients.claim` for immediate activation
- Registered with `updateViaCache: 'none'` to bypass HTTP cache on update checks
- Page auto-reloads when a new SW takes control (WebKit compat)

## Common pitfalls

- **HTML div balance** — the editor toolbar, formatting toolbar, settings modal, and note list are deeply nested. After any HTML change, verify with `python3 -c "c=open('index.html').read(); print(c.count('<div') == c.count('</div>'))"`
- **After innerHTML changes** — always call `App.refreshIcons(container)` or icons won't render
- **Event handlers on replaced elements** — `refreshIcons()` replaces `<i>` with `<svg>`. Handlers should be on parent buttons, not on the `<i>` elements
- **`marked` version** — CDN loads v15 which has `sanitize` option but it strips table elements. XSS protection uses DOMPurify in `switchToPreview()` instead.
- **localStorage writes** — wrapped in try/catch; quota exceeded silently toasts
- **`App.state.settings` mutation** — always call `App.saveSettings()` after changing, and check `dom.*.disabled` before reading field values (server config locks fields)
- **Theme dropdown sync** — never set `dom.themeSelect.value = theme` directly; always use `App.themeToDropdownValue(theme)` since non-Catppuccin values in the dropdown are family names, not full theme IDs
- **Sync SHA conflicts** — always use `remoteSHAs[note.id] || note._sha` order (remote first) when pushing. Reversing this causes 409 errors when the remote file has been updated since the last local sync
- **SW cache name** — must be updated on every release in `sw.js`; old cache names are purged on activate
