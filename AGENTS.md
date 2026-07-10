# CLAUDE.md

本檔案提供 Claude Code (claude.ai/code) 在此儲存庫中工作時的指引。

## 專案

一個以 **Astro 6**（靜態輸出）搭配 **Preact** islands 提供互動性所建置的個人部落格（「純白罐子 / 州・Kevin」）。透過 GitHub Actions 部署到 GitHub Pages。內容與 UI 文案主要為繁體中文。

需要 Node `>=22.12.0`（CI 使用 Node 24）。

## 指令

```sh
npm run dev        # 開發伺服器，網址 localhost:4321（搜尋注意事項見下方）
npm run build      # astro build + 產生 Pagefind 搜尋索引到 dist/
npm run preview    # 在本機提供已建置的 dist/ — 搜尋在此可正常運作
npm run astro -- check     # 對 .astro 檔案進行型別檢查
```

本專案未設定任何測試執行器或 linter。

在任務中啟動開發伺服器時，優先使用背景模式以免卡住流程：`astro dev --background`（以 `astro dev stop`、`astro dev status`、`astro dev logs` 管理）。

### 搜尋只在 build 之後才存在

`npm run build` 會執行 `astro build && npx pagefind --site dist`。Pagefind 會掃描建置後的 HTML，並將搜尋 bundle 寫入 `dist/pagefind/`。`SearchOverlay.jsx` 在執行期透過 `import(location.origin + '/pagefind/pagefind.js')` 載入它。

衍生後果：
- 在 `npm run dev` 下，`/pagefind/` 檔案並不存在，因此搜尋在執行期會失敗。若要測試搜尋，請用 `npm run build` 再 `npm run preview`。
- **部署工作流程（`.github/workflows/astro.yml`）直接執行 `astro build`，而非 `npm run build`，所以它「不會」產生 Pagefind 索引。** 在工作流程改為執行 Pagefind 步驟（或改用 `npm run build`）之前，線上站台的搜尋都會是壞的。

## 架構

### 內容管線（Content pipeline）
- 文章存放於 `src/blog/**/*.md`。以 `_` 為前綴的檔案會被 glob loader 排除。
- 唯一的 content collection 定義於 `src/content.config.ts`（collection 名稱為 `blog`）。其 Zod schema 是唯一權威來源 — frontmatter 必須符合它，否則 build 會失敗。詳見下方 [文章 frontmatter 規格](#文章-frontmatter-規格)。
- 文章的 `id` 由其在 `src/blog/` 下的路徑推導而來（例如 `src/blog/2026/2026-1.md` → id `2026/2026-1`），並成為網址 `/posts/2026/2026-1`。
- 部分 markdown frontmatter 中出現的 `layout:` 欄位為殘留無用欄位。文章是透過 `src/pages/posts/[...slug].astro` 渲染，它呼叫 `render(post)` 並將內容包進 `MarkdownPostLayout.astro` — collection 的渲染路徑並不會使用 `layout:` frontmatter。

### 文章 frontmatter 規格

每篇文章的 frontmatter 都會在 build 時對照 `src/content.config.ts` 中的 Zod schema 進行驗證。違反 schema 的文章會導致 build 失敗。欄位如下：

| 欄位 | 型別 | 必填 | 說明 |
|-------|------|----------|-------|
| `title` | string | ✅ | 文章標題；作為頁面 `<title>` 與 `<h1>`。 |
| `pubDate` | date | ✅ | 必須是合法的 YAML 日期（例如 `2026-07-01`），會被解析為 `Date`。 |
| `description` | string | ✅ | 顯示於文章頁面標題下方。 |
| `author` | string | ✅ | 顯示於文章 meta 資訊列。 |
| `image` | object `{ url, alt }` | ⛔ 選填 | 主視覺（hero）圖片。若有提供，`url`（string）與 `alt`（string）**兩者皆為必填**。若要略過主視覺，請整個省略 `image:` 區塊 — `MarkdownPostLayout.astro` 以 `frontmatter.image?.url` 做了防護。 |
| `tags` | string[] | ✅ | 建議使用非空陣列；驅動標籤頁面與側欄的標籤雲。 |

frontmatter 範例：

```yaml
---
layout: ../../layouts/MarkdownPostLayout.astro
title: 我的文章標題
pubDate: 2026-07-01
description: 一句話描述這篇文章。
author: 州・Kevin
image:
  url: 'https://example.com/hero.jpg'
  alt: '封面圖的替代文字'
tags: ['C#', 'Web']
---
```

若要發佈沒有主視覺圖片的文章，請將 `image:` 那三行完整刪除（不要留下空的或只填一半的 `image:` — 只要 `image` 物件存在，就仍會要求同時具備 `url` 與 `alt`）。

### 路由（全部為靜態，於 build 時產生）
- `/` — `index.astro`：個人簡介 + 最新 5 篇文章 + 側欄
- `/blog` — `blog.astro`：透過 `PostTimelineList`（accordion 模式）列出所有文章
- `/posts/[...slug]` — 個別文章詳細頁（slug = 文章 id）
- `/tags` 與 `/tags/[tag]` — 標籤索引與各標籤的文章列表
- `/about`、`/rss.xml`

### 版面 / 元件組合
- `BaseLayout.astro` 是頁面外殼（`<html>` + `Header` + `<slot/>` + `Footer`，並匯入 `global.css`）。大多數頁面都使用它。
- `MarkdownPostLayout.astro` 是文章詳細頁的版面（header、主視覺圖片、內容 slot、近期文章 timeline、側欄）。
- 雙欄格線（`1fr 280px`，內容 + `Sidebar`）在 `index`、`blog`、`tags/[tag]` 與 `MarkdownPostLayout` 中以行內方式重複出現。`Sidebar` 會依傳入的 `allPosts`/`allTags` props 建立標籤計數表與標籤雲。
- 作者「Profile」區塊（name/subtitle/bio/tags）在 `index.astro`、`blog.astro`、`tags/[tag].astro` 與 `MarkdownPostLayout.astro` 中是**寫死且重複的**。要更動人物設定就得逐一修改它們。
- Preact islands 以 `client:load` 載入：`SearchOverlay.jsx`（在 `Header` 中）與 `CategoryCard.jsx`（在 `Sidebar` 中）。

### 主題（Theming）
- 設計 token 是位於 `src/styles/global.css` 中的 CSS 自訂屬性（OKLCH 色彩、間距、圓角、最大寬度），並有一個 `html.dark` 區塊覆寫色彩 token 以供深色模式使用。
- `ThemeIcon.astro` 掌管主題邏輯：一段行內 script 會在繪製前依 `localStorage`/`prefers-color-scheme` 設定 `html.dark`，並在點擊時切換。設定樣式時，優先使用既有的 CSS 變數，而非寫死色碼。

### 留言（Comments）
- `Giscus.astro` 注入 giscus script，並透過對 `documentElement` class 的 `MutationObserver` 在主題切換時重新載入它。目前 `data-repo` / `data-repo-id` / `data-category-id` 指向另一個儲存庫（`Bxgldh/Bxgldh.github.io`），需要為本站更新。

## Astro 起始樣板的已知殘留物

以下項目雖存在，但並非線上站台的一部分；除非刻意接上使用，否則請視為死程式碼：
- `src/layouts/Layout.astro`、`src/layouts/BlogPost.astro`、`src/components/Welcome.astro`、`src/components/Greeting.jsx`
- `src/components/BaseHead.astro` — 僅被未使用的 `layouts/BlogPost.astro` 參照。它使用了 `<Font cssVariable="--font-atkinson">`，需要一個並不存在的 `experimental.fonts` 設定；渲染它會導致 build 失敗。
- `src/consts.ts` 仍保有佔位值（`SITE_TITLE = 'Astro Blog'`）。
- `src/pages/rss.xml.js` 以 glob 掃描 `src/pages/**/*.md`，但文章位於 `src/blog/`，因此 RSS feed 並不包含它們。將其指向 `blog` collection 即可修正。

## 部署

推送到 `main` 會觸發 `.github/workflows/astro.yml`，它以 Astro 建置（從 Pages 設定傳入 `--site`/`--base`）並部署到 GitHub Pages。`astro.config.mjs` 設定了 `site: "https://white-jar.github.io"`，並註冊 `preact()` 與 `icon()` 整合。

## 文件

完整文件：https://docs.astro.build

進行相關任務前，請先參考這些指南：

- [新增頁面、動態路由或 middleware](https://docs.astro.build/en/guides/routing/)
- [使用 Astro 元件](https://docs.astro.build/en/basics/astro-components/)
- [使用 React、Vue、Svelte 或其他框架元件](https://docs.astro.build/en/guides/framework-components/)
- [新增或管理內容](https://docs.astro.build/en/guides/content-collections/)
- [新增樣式或使用 Tailwind](https://docs.astro.build/en/guides/styling/)
- [支援多國語言](https://docs.astro.build/en/guides/internationalization/)
