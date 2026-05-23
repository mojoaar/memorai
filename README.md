# memorai

**Your second brain, in markdown.**

## Screenshot

![memorai](assets/memorai.png)

## Features

- **Markdown editing** with live preview and formatting toolbar (bold, italic, headings, etc.)
- **12 themes** — Catppuccin, Nord, Tokyo Night, Dracula, One Dark, GitHub
- **GitHub Repo sync** — notes stored as `.md` files with YAML frontmatter
- **Tags** with autocomplete and inline search
- **PWA** — installable on desktop and mobile, works offline
- **Image support** — paste, drag & drop, stored in repo
- **URL hash routing** — share notes via link
- **Export** — individual notes as `.md` or full backup as JSON
- **Server config** — deploy with `config.json` for shared settings
- **147 Lucide icons** — embeddable inline via `:icon-name:` syntax
- **SEO** — Open Graph, Twitter Cards, JSON-LD, canonical URL

## Quick Start

1. Clone and serve with any static server:
   ```bash
   git clone git@github.com:mojoaar/memorai.git
   cd memorai
   python3 -m http.server 8080
   ```
2. Open `http://localhost:8080`
3. Go to Settings → enter your GitHub token and repository
4. Click "Sync with Repo" to start syncing

## Configuration

Place a `config.json` at the web root for deployment-wide settings:

```json
{
  "githubToken": "ghp_xxx",
  "repo": "owner/repo-name",
  "branch": "main",
  "url": "https://notes.example.com",
  "title": "My Notes",
  "description": "Personal knowledge base"
}
```

All fields are optional. See `config.example.json` for details.

## Tech Stack

- Vanilla JavaScript (no framework, no build step)
- CSS custom properties for theming
- GitHub Contents API for sync
- `marked` for markdown rendering
- Service Worker for offline support

## Sponsor

If you find memorai useful, consider [buying me a coffee](https://buymeacoffee.com/mojoaar).

## License

MIT — see [LICENSE](LICENSE)

---

## Changelog

### 0.1.0 — Initial Release

- Markdown editor with live preview and formatting toolbar
- 12 themes: Catppuccin, Nord, Tokyo Night, Dracula, One Dark, GitHub
- GitHub Repo sync via Contents API (notes as `.md`, images as files)
- Tags with autocomplete and search across title, content, and tags
- PWA support (offline cache, installable on desktop and mobile)
- Image paste, drag & drop, and upload with repo storage
- URL hash routing for sharing and bookmarking notes
- Export single notes as `.md` or full backup as JSON
- Server config via `config.json` with field locking
- 147 Lucide icons via inline embedded SVGs
- Icon picker with search
- Service worker with cache management and API filtering
- SEO: Open Graph, Twitter Cards, JSON-LD, canonical URL
