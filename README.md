# Jinnah Park Rawalpindi — Astro + Tailwind + TypeScript

راولپنڈی، پاکستان کے Jinnah Park / جناح پارک کے لیے اردو، RTL، سنگل پیج وزیٹر گائیڈ۔

## ٹیک اسٹیک
- Astro 7.2.9
- Tailwind CSS 4.3.3
- TypeScript 6.0.3 (`@astrojs/check` کی TypeScript 6 سپورٹ رینج میں)
- `@astrojs/cloudflare` 14.2.5
- pnpm 11.24.0
- Node.js 24.20.0 LTS
- Wrangler 4.127.1

## ڈومین کی واحد کنفیگریشن
پروڈکشن ڈومین `jinnahpark.com` ہے اور بطور ڈیفالٹ Astro `site` فیلڈ میں سیٹ ہے۔ ضرورت پڑنے پر `SITE_URL` سے اسے اوور رائیڈ کیا جا سکتا ہے:

```bash
SITE_URL=https://your-domain.tld pnpm build
```

canonical / Open Graph / JSON-LD سارے absolute URLs خودکار بنتے ہیں۔

## مقامی رن
```bash
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

## Cloudflare Workers
`wrangler.jsonc` موجود ہے (Astro 6+ مطابق `main` فیلڈ `@astrojs/cloudflare/entrypoints/server` پر سیٹ ہے)۔ Production deploy سے پہلے Cloudflare account authentication مقرر کریں، پھر:

```bash
pnpm deploy
```

## PWA
- `public/manifest.webmanifest` — installable PWA (RTL، ur-PK، standalone)
- `public/sw.js` — service worker (navigation network-first، static cache-first)
- `public/icons/icon-192.png` / `icon-512.png` / `icon.svg` — آئیکن
- آئیکن دوبارہ بنانے کے لیے: `node scripts/generate-icons.mjs` (خالص Node، کوئی dependency نہیں)
- Service worker صرف غیر-localhost ماحول میں رجسٹر ہوتا ہے تاکہ dev تجربہ متاثر نہ ہو

## تصاویر
`public/images/` میں پیک شدہ JPG assets موجود ہیں، اس لیے سائٹ کھلنے کے لیے کسی image download script کی ضرورت نہیں۔

## حقیقی Rawalpindi تصویر حوالہ جات
Wikimedia Commons پر Jinnah Park, Rawalpindi کی واضح category:
- https://commons.wikimedia.org/wiki/Category:Jinnah_Park,_Rawalpindi
- https://commons.wikimedia.org/wiki/File:Jinnah_Park_Entrance.jpg — Inlandmamba, CC BY-SA 3.0
- https://commons.wikimedia.org/wiki/File:Jinnah_Park-1.jpg — Inlandmamba, CC BY-SA 3.0
- https://commons.wikimedia.org/wiki/File:An_old_tree_in_Jinnah_Park.jpg — Inlandmamba, CC BY-SA 3.0
- https://commons.wikimedia.org/wiki/File:Sunset_fountain.jpg — M. Aeraf, CC BY-SA 4.0

## Entity references
- Google Maps: https://maps.app.goo.gl/dXD85cQCFkmbErrWA
- Wikidata: https://www.wikidata.org/wiki/Q6202662
- RDA: https://rda.gop.pk/
- Punjab Tourism: https://tourism.punjab.gov.pk/
- PTDC: https://tourism.gov.pk/

## ڈومین
حتمی پروڈکشن ڈومین: `jinnahpark.com`
