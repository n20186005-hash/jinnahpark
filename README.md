# Jinnah Park Rawalpindi visitor guide

A single Urdu RTL site with an existing English visitor-question section. Astro SSR serves the guide, seven-day Open-Meteo forecast and legal/settings pages on https://jinnahpark.com/ through the Cloudflare Worker `jinnahpark`.

```sh
CI=true corepack pnpm install --frozen-lockfile
npm run check
corepack pnpm run build
npx wrangler deploy --dry-run
```

The declared package manager is pnpm11.24.0. Use that version when verifying installation; another host shim can infer a different dependency store. Only the locked esbuild0.28.1/0.28.2 and workerd1.20260828.1 native build scripts are approved. Supply-chain review and refusal of unspecified builds remain enabled. Dependencies and the lockfile are unchanged.

The adapter-generated configuration must select `entry.mjs`, the explicit protocol guard and `run_worker_first`. Cloudflare Images `IMAGES` and session KV `SESSION` remain the adapter's existing bindings. The build sanitizes public generated module identifiers. Local build or dry-run success does not establish production HTTP or browser acceptance.

Maps hours/reviews are dated third-party observations, not unconditional operating promises or a site-owned rating. Cinepax's directory concerns its own venue, rather than every park service. Prices and facility availability require confirmation with the relevant operator.

See [per-file image credits](IMAGE-CREDITS.md). The photographs were taken by Inlandmamba in2012; the entrance file is the Commons2020 derivative by Verne Equinox. See exact attribution and edits in the credits; do not treat historical images as present conditions. Google Analytics uses the existing `jp-cookie-consent` choice; settings apply verified choices immediately, with truthful failures. Hosting performance measurement and Google Maps are separate services.
