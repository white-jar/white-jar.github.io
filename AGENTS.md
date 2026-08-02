# AGENTS.md

本檔案提供在此儲存庫中工作的指引。若另有 `CLAUDE.md`，兩者內容應保持同步。

## 專案

一個以 **Astro 6**（靜態輸出）搭配 **Preact** islands 所建置的個人部落格（「純白罐子 / 州・Kevin」）。透過 GitHub Actions 部署到 GitHub Pages。內容與 UI 文案主要為繁體中文。

需要 Node `>=22.12.0`（CI 使用 Node 24）。**本專案未設定測試執行器或 linter** — 唯一的驗證手段是 `npm run build`。

## 指令

```sh
npm run dev        # 開發伺服器 → http://localhost:3000
                   # （astro.config.mjs 設 server.port=3000，非 Astro 預設的 4321）
npm run build      # astro build + 產生 Pagefind 搜尋索引到 dist/ —— 改動後的驗證方式
npm run preview    # 在本機提供已建置的 dist/
```

- `npm run astro -- check` 需要 `@astrojs/check` 與 `typescript`，**目前尚未安裝**；要先安裝才能做型別檢查。
- 沒有 `astro dev --background` 這個旗標（不存在）。要背景執行開發伺服器，請用 shell 本身的背景機制。
- 開發伺服器啟動會佔住終端機；若要在任務中同時執行其他命令，請自行以背景方式啟動。

### 搜尋只在 build 之後才存在

`npm run build` 執行 `astro build && npx pagefind --site dist`。Pagefind 掃描建置後的 HTML，把搜尋 bundle 寫入 `dist/pagefind/`。`SearchOverlay.jsx` 在執行期以 `import(location.origin + '/pagefind/pagefind.js')` 載入它。因此：

- **`npm run dev` 下 `/pagefind/` 不存在，搜尋在執行期會失敗** — 這不是 bug。要測搜尋，先 `npm run build` 再 `npm run preview`。
- 部署工作流程（`.github/workflows/astro.yml`）**已包含** `npx pagefind --site dist` 步驟，線上站台的搜尋正常。

### Mermaid 圖表渲染

- ` ```mermaid ``` ` 程式碼區塊在 **build 時** 渲染成 inline SVG（零 client JS），透過自訂 rehype plugin `src/utils/rehype-mermaid-dual.js`（底層是 `mermaid-isomorphic` + Playwright）。
- 每個圖會渲染 **light 與 dark 兩份 SVG**，包在 `<div class="mermaid">` 內，以本站的 `html.dark` class 切換（`.mermaid-theme-light` / `.mermaid-theme-dark`，樣式在 `MarkdownPostLayout.astro` 的 `is:global` 區塊）。
- `astro.config.mjs` 已設定 `markdown.syntaxHighlight.excludeLangs: ['mermaid']` 與 `markdown.rehypePlugins: [rehypeMermaidDual]`，兩者缺一不可（不排除的話 Shiki 會先拆散 diagram 字串）。
- **需要 Playwright Chromium**：本機首次跑 build 前先 `npx playwright install chromium`；CI（`.github/workflows/astro.yml`）已安裝 `--with-deps chromium` 與 `fonts-noto-color-emoji`（Ubuntu 上 emoji 需字型否則顯示方框）。
- 渲染失敗時 plugin 保留原 code block 並在 build 印出警告，不會讓 build 失敗。`npm run dev` 下同樣會渲染（本機需已裝 Chromium）。

## 內容管線

- 文章存放於 `src/blog/**/*.md`。以 `_` 為前綴的檔案會被 glob loader 排除。
- **`src/content/blog/` 是 Astro 起始樣板的殘留目錄，不是現役文章位置**（現役在 `src/blog/`），會被忽略。
- 唯一 content collection 定義於 `src/content.config.ts`（名稱 `blog`）。其 Zod schema 是 frontmatter 的唯一權威來源 — 違規會讓 build 失敗。
- 文章的 `id` 由其在 `src/blog/` 下的路徑推導（例：`src/blog/2026/2026-1.md` → id `2026/2026-1`），並成為網址 `/posts/2026/2026-1`。
- markdown frontmatter 中的 `layout:` 欄位是殘留無用欄位。文章經 `src/pages/posts/[...slug].astro` 呼叫 `render(post)` 並包進 `MarkdownPostLayout.astro` 渲染，不使用 `layout:`。

### 文章 frontmatter 規格

| 欄位 | 型別 | 必填 | 說明 |
|-------|------|----------|-------|
| `title` | string | ✅ | 頁面 `<title>` 與 `<h1>`。 |
| `pubDate` | date | ✅ | 合法 YAML 日期（如 `2026-07-01`），解析為 `Date`。 |
| `description` | string | ✅ | 顯示於文章頁面標題下方。 |
| `author` | string | ✅ | 顯示於文章 meta 列。 |
| `image` | object `{ url, alt }` | ⛔ 選填 | 主視覺。若提供，`url` 與 `alt` **皆必填**；要省略請整個刪掉 `image:` 區塊（只要 `image` 存在就要求兩者齊全）。 |
| `tags` | string[] | ✅ | 驅動標籤頁面與側欄標籤雲。 |

## 架構

- `BaseLayout.astro` 是頁面外殼（`<html>` + `Header` + `<slot/>` + `Footer` + `global.css`）。多數頁面使用它。`MarkdownPostLayout.astro` 是文章詳細頁版面。
- 雙欄格線 `grid-template-columns: 1fr 280px`（內容 + `Sidebar`）在 `index`、`blog`、`about`、`tags/[tag]` 與 `MarkdownPostLayout` 中以行內方式重複出現。`Sidebar` 接收 `allPosts`/`allTags` props。
- **作者 Profile 已抽成 `Profile.astro` 元件，但 props（name/subtitle/bio/tags）仍在每個頁面寫死重複**。注意 `index.astro` 與 `MarkdownPostLayout.astro` 的 `bio` 文字略有出入。要改人物資料需逐一修改各頁的 `<Profile .../>`。
- **Tag slug 轉換**：`#` → `sharp`（`src/utils/tag.ts` 的 `tagToSlug`，以及多處 inline 的 `.replace(/#/g, 'sharp')`）。tag 含 `#` 時 URL 必須經過此轉換，否則連結會壞。
- Preact islands 全部 `client:load`：`SearchOverlay.jsx`（在 `Header`）、`CategoryCard.jsx`（在 `Sidebar`）、`ViewCounter.jsx`（首頁與文章頁）。
- 主題：設計 token 為 `src/styles/global.css` 的 CSS 自訂屬性（OKLCH），`html.dark` 區塊覆寫深色模式；`ThemeIcon.astro` 掌管切換。設定樣式優先使用既有 CSS 變數。
- 文章頁的 `.post-content` 樣式在 `MarkdownPostLayout.astro` 中以 `<style is:global>` 撰寫（因 markdown 內容沒有 scoped 屬性）。

### 留言與瀏覽次數

- 留言：`Giscus.astro` 注入 giscus script，並以 `MutationObserver` 在主題切換時重新載入。`data-repo` 已指向本站（`white-jar/white-jar.github.io`）。
- 瀏覽次數：`ViewCounter.jsx` 呼叫 Waline API（`src/lib/waline.ts`）。`mode="increment"` 用於文章頁（POST +1），`mode="readonly"` 用於首頁列表。
- Waline 伺服器網址來自 `PUBLIC_WALINE_SERVER_URL`（本機：複製 `.env.example` 為 `.env`；CI：repo Actions variable）。**未設定時瀏覽次數顯示「—」且不會壞 build**，但計數不運作。

## 已知死程式碼（Astro 起始樣板殘留，勿當現役）

- `src/layouts/Layout.astro`、`src/layouts/BlogPost.astro`
- `src/components/Welcome.astro`、`src/components/Greeting.jsx`
- `src/components/BaseHead.astro` — 使用了 `<Font cssVariable>`，需要不存在的 `experimental.fonts` 設定；**渲染它會導致 build 失敗**
- `src/components/Menu.astro`、`Navigation.astro`、`Social.astro`、`HeaderLink.astro`、`FormattedDate.astro`
- `src/scripts/menu.js`、`src/content/blog/`
- `src/consts.ts` 仍保有佔位值（`SITE_TITLE = 'Astro Blog'`），未被任何程式碼使用。

注意：**`src/components/BlogPost.astro` 是現役元件**（`tags/[tag].astro` 使用），別與死的 `src/layouts/BlogPost.astro` 混淆。

### RSS 目前是壞的

`src/pages/rss.xml.js` 以 glob 掃描 `./**/*.md`（`src/pages/` 下沒有 md），因此 RSS feed 是空的，且 title/description 仍為起始樣板的 `'Astro Learner'`。要修正需改為讀取 `blog` collection。

## 部署

推送到 `main` 觸發 `.github/workflows/astro.yml`：`astro build --site --base`（Pages 設定注入）→ `npx pagefind --site dist` → 部署到 GitHub Pages。`astro.config.mjs` 設 `site: "https://white-jar.github.io"`，並註冊 `preact()` 與 `icon()` 整合。

## 其他注意事項

- **`.gitignore` 會排除 `AGENTS.md`、`CLAUDE.md`、`.claude/`、`.opencode/`、`.agents/`、`openspec/`** — 本檔不會被 commit。若改了它，也請同步更新同內容的 `CLAUDE.md`（若存在）。
