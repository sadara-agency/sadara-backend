# Tesseract language data (InBody OCR)

These `.traineddata` files let the deterministic InBody report parser
(`src/modules/wellness/inbodyExtract.service.ts`) OCR uploaded photos/scans
**offline** — without downloading language data from a CDN at runtime (which
can time out or fail on the production VM).

## Files

- `eng.traineddata` — English (LSTM, `tessdata_fast`)
- `ara.traineddata` — Arabic (LSTM, `tessdata_fast`)

Source: https://github.com/tesseract-ocr/tessdata_fast

`tessdata_fast` is the LSTM-optimized set — smaller and faster than the full
models, and the recommended set for `tesseract.js` v5.

## IMPORTANT: keep them RAW (uncompressed)

These are committed **uncompressed**. The service calls `createWorker(..., {
langPath, gzip: false })` when these bundled files are present. If you replace
them with gzipped `*.traineddata.gz` files, also flip `gzip` back to `true`, or
OCR will throw `ENOENT: ...eng.traineddata.gz`.

## How they ship to production

The build step copies `src/assets → dist/assets` (see `backend/package.json`
`build` script), so these land at `dist/assets/tessdata/*.traineddata`. The
service resolves `langPath` to that directory at runtime. If the directory is
missing, it falls back to the tesseract.js CDN (gzipped, `gzip: true`).

## Refreshing

```bash
curl -sL -o src/assets/tessdata/eng.traineddata \
  https://github.com/tesseract-ocr/tessdata_fast/raw/main/eng.traineddata
curl -sL -o src/assets/tessdata/ara.traineddata \
  https://github.com/tesseract-ocr/tessdata_fast/raw/main/ara.traineddata
```

## Env overrides (see `src/config/env.ts`)

- `OCR_LANG_PATH` — point at a different tessdata directory
- `OCR_TIMEOUT_MS` — per-image OCR ceiling (default 25000)
- `OCR_DISABLE=true` — skip OCR entirely (fast `ocr-failed`)
