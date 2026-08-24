# Putting this on samirkassir.me

The tool lives in `src/mwm/`. That folder is self-contained: it has no imports outside itself, its own stylesheet, and no dependency on anything in the site. Copy it into the Astro project and mount it as a React island.

## What changes on the site

| File | Change |
|---|---|
| `src/mwm/**` | new, copied from this repo |
| `src/pages/wealth.astro` | new, the page at `/wealth` |
| `src/components/WealthTool.astro` | new, the section on the homepage |
| `src/pages/index.astro` | two lines: import `WealthTool`, render it between `<Work />` and `<Writing />` |
| `src/components/Hero.astro` | one line: a `Tool` link in the nav pointing at `#tool` |
| `astro.config.mjs` | two lines: import `@astrojs/react`, add `integrations: [react()]` |
| `package.json` | adds `@astrojs/react`, `react`, `react-dom`, `motion`, and the React types |

Nothing existing is deleted or rewritten. The section is numbered `04 / Built` and sits after Work, which does not collide with any index already in use.

## Steps

```bash
cd 04_Website/Working
npm install
npm run dev          # check localhost:4321/wealth and the new homepage section
npm run build
```

## Two things that will bite you

**The `.tsx` extension in the import is required.** `src/pages/wealth.astro` imports the component as `'../mwm/MiniWealthManager.tsx'`, not `'../mwm/MiniWealthManager'`. Astro matches a component to its renderer by file extension at build time. Drop the extension and the build succeeds but the page fails at render with `NoMatchingRenderer`, which is a confusing error for a two-character cause.

**Use `client:only="react"`, not `client:load`.** The tool has no meaningful server-rendered state and renders nothing useful without JavaScript, so server-rendering it just makes the build slower and risks a hydration mismatch on the animated intro.

## Palette

`src/mwm/styles.css` redeclares the site's five tokens locally, scoped to `.mwm`, so the component works standalone in this repo and inside the site without either one depending on the other. If the site palette ever changes, the values are at the top of that file and nowhere else.

The chart colours are two families derived from tokens that already exist: warm neutrals for defensive assets, oxblood for the ones that can hurt you, ordered light to dark by volatility. No new hues were added to the design system.

## Deploying it on its own

The standalone repo builds to a static `dist/` with no server. Cloudflare Pages settings:

- Build command: `npm run build`
- Output directory: `dist`
- Node version: 20 or later

## Keeping the two copies in sync

`src/mwm/` is duplicated between this repo and the site rather than published as a package, which for a weekend project is the right trade. When you change something here, copy the folder across:

```bash
rsync -a --delete src/mwm/ ../path-to-site/src/mwm/ --exclude '__tests__'
```

The tests stay in this repo only; the site does not need them.
