# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A personal blog ("泥巴人 / 強・Kelvin") built with **Astro 6** (static output) using **Preact** islands for interactivity. Deployed to GitHub Pages via GitHub Actions. Content and UI copy are primarily in 繁體中文.

Node `>=22.12.0` is required (CI uses Node 24).

## Commands

```sh
npm run dev        # Dev server at localhost:4321 (see search caveat below)
npm run build      # astro build + Pagefind search index into dist/
npm run preview    # Serve the built dist/ locally — search works here
npm run astro -- check     # Type-check .astro files
```

There is no test runner or linter configured in this project.

When starting the dev server during a task, prefer background mode so it doesn't block: `astro dev --background` (manage with `astro dev stop`, `astro dev status`, `astro dev logs`).

### Search only exists after a build

`npm run build` runs `astro build && npx pagefind --site dist`. Pagefind scans the built HTML and writes the search bundle to `dist/pagefind/`. `SearchOverlay.jsx` loads it at runtime via `import(location.origin + '/pagefind/pagefind.js')`.

Consequences:
- In `npm run dev` the `/pagefind/` files do not exist, so search fails at runtime. To test search, use `npm run build` then `npm run preview`.
- **The deploy workflow (`.github/workflows/astro.yml`) runs `astro build` directly, not `npm run build`, so it does NOT generate the Pagefind index.** Live-site search will be broken until the workflow is changed to run the Pagefind step (or `npm run build`).

## Architecture

### Content pipeline
- Posts live in `src/blog/**/*.md`. Files prefixed with `_` are excluded by the glob loader.
- The single content collection is defined in `src/content.config.ts` (collection name `blog`). Its Zod schema (`title`, `pubDate` as date, `description`, `author`, `image{url,alt}`, `tags[]`) is the source of truth — frontmatter must match it or the build fails.
- A post's `id` is derived from its path under `src/blog/` (e.g. `src/blog/2026/2026-1.md` → id `2026/2026-1`), which becomes the URL `/posts/2026/2026-1`.
- The `layout:` field present in some markdown frontmatter is vestigial. Posts are rendered through `src/pages/posts/[...slug].astro`, which calls `render(post)` and wraps the content in `MarkdownPostLayout.astro` — the `layout:` frontmatter is not used by the collection rendering path.

### Routing (all static, generated at build)
- `/` — `index.astro`: profile + 5 most recent posts + sidebar
- `/blog` — `blog.astro`: all posts via `PostTimelineList` (accordion mode)
- `/posts/[...slug]` — individual post detail (slug = post id)
- `/tags` and `/tags/[tag]` — tag index and per-tag post listings
- `/about`, `/rss.xml`

### Layout / component composition
- `BaseLayout.astro` is the page shell (`<html>` + `Header` + `<slot/>` + `Footer`, imports `global.css`). Most pages use it.
- `MarkdownPostLayout.astro` is the post-detail layout (header, hero image, content slot, recent-posts timeline, sidebar).
- The two-column grid (`1fr 280px`, content + `Sidebar`) is repeated inline in `index`, `blog`, `tags/[tag]`, and `MarkdownPostLayout`. The `Sidebar` builds a tag-count map and a tag cloud from `allPosts`/`allTags` passed in as props.
- The author "Profile" block (name/subtitle/bio/tags) is **hard-coded and duplicated** across `index.astro`, `blog.astro`, `tags/[tag].astro`, and `MarkdownPostLayout.astro`. Changing the persona means editing all of them.
- Preact islands are loaded with `client:load`: `SearchOverlay.jsx` (in `Header`) and `CategoryCard.jsx` (in `Sidebar`).

### Theming
- Design tokens are CSS custom properties (OKLCH colors, spacing, radius, max-width) in `src/styles/global.css`, with a `html.dark` block overriding the color tokens for dark mode.
- `ThemeIcon.astro` holds the theme logic: an inline script sets `html.dark` from `localStorage`/`prefers-color-scheme` before paint and toggles on click. Prefer the existing CSS variables over hard-coded colors when styling.

### Comments
- `Giscus.astro` injects the giscus script and reloads it on theme change via a `MutationObserver` on `documentElement`'s class. The `data-repo` / `data-repo-id` / `data-category-id` currently point at a different repository (`Bxgldh/Bxgldh.github.io`) and need updating for this site.

## Known leftovers from the Astro starter template

These exist but are not part of the live site; treat as dead code unless intentionally wired up:
- `src/layouts/Layout.astro`, `src/layouts/BlogPost.astro`, `src/components/Welcome.astro`, `src/components/Greeting.jsx`
- `src/components/BaseHead.astro` — referenced only by the unused `layouts/BlogPost.astro`. It uses `<Font cssVariable="--font-atkinson">`, which requires an `experimental.fonts` config that does not exist; rendering it would break the build.
- `src/consts.ts` still has placeholder values (`SITE_TITLE = 'Astro Blog'`).
- `src/pages/rss.xml.js` globs `src/pages/**/*.md`, but posts live in `src/blog/`, so the RSS feed does not include them. Point it at the `blog` collection to fix.

## Deployment

Push to `main` triggers `.github/workflows/astro.yml`, which builds with Astro (passing `--site`/`--base` from the Pages config) and deploys to GitHub Pages. `astro.config.mjs` sets `site: "https://white-jar.github.io"` and registers the `preact()` and `icon()` integrations.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
