# Gate32 · AI transcription & subtitles, 100% in your browser

*[Versión en español](README.es.md)*

**https://gate32.autoritasai.com/en/**

Turn audio and video into text or SRT/VTT subtitles with Whisper running
**locally in your browser**. Free, no limits, no sign-up, and your files never
leave your device.

![Gate32](public/og.png)

## What problem it solves

Every "free" transcriber has a catch: trial minutes, per-file caps, sign-up
walls and — structurally — **they upload your audio to their servers**
(Otter's free plan allows 3 file imports, ever). The private alternatives are
desktop apps, often macOS-only, or command-line tools.

Gate32 removes the trade-off: verifiable privacy with the convenience of a web
page.

## How to use it

1. Open the site and drop in an audio or video file (or record from your mic).
2. On first run your browser downloads the model (~50–250 MB depending on
   quality) and caches it. After that it works offline.
3. Whisper transcribes in chunks with visible progress.
4. Fix the text with synced audio playback, then export TXT, Markdown, SRT,
   VTT or JSON.

You can re-open an exported JSON later — drop it back in — which lets you
transcribe on a fast machine and review the result on another one.

### Recording a meeting

On desktop Chrome or Edge there are two buttons over one mechanism. **Record
a meeting** captures the audio your meeting tab is *playing*
(`getDisplayMedia({audio: true})`) and mixes it with your microphone, so it
picks up everyone even when you're wearing headphones — an ambient recorder in
that setup only ever captures you. **Transcribe a video or stream from another
tab** does the same without touching the microphone, for videos, live classes,
webinars and online radio.

The split is not cosmetic: in a meeting your voice belongs in the recording,
over someone else's video it would only add your room noise and ask for a
permission that serves no purpose.

No bot joins the call: Gate32 is a browser tab listening to another browser
tab, so it never appears in the participant list and the audio is never
uploaded. If the shared tab arrives with no audio track — the user didn't tick
"Also share tab audio" — capture **aborts with an explanation** instead of
silently recording half the meeting. Recording other people requires their
consent; the app says so before it starts.

## Architecture

```
index.html            landing + app shell (SEO, OG, JSON-LD, FAQ)
en/index.html         English landing + app
src/main.ts           UI states, editing, exports, history
src/styles.css        light/dark, responsive, accessible
src/lib/
  worker.ts           Whisper via transformers.js (WebGPU → WASM fallback)
  transcriber.ts      typed worker client (swappable AI layer)
  audio.ts            decoding to mono 16 kHz (OfflineAudioContext)
  meeting.ts          tab-audio + mic capture for video calls
  formats.ts          pure logic: windows, merging, TXT/MD/SRT/VTT/JSON
  i18n.ts             strings for JS-generated UI (ES/EN)
  analytics.ts        anonymous validation events
  history.ts          local history (localStorage, no account)
scripts/e2e.mjs       critical-journey E2E (Playwright)
src/lib/__tests__/    unit tests (vitest)
```

Key decisions:

- **No processing backend.** Audio is decoded and transcribed client-side; the
  only network traffic is the model download from the Hugging Face CDN
  (browser-cached, and self-hostable — see below).
- **Overlapping 30 s windows** with 5 s overlap, merged by midpoint: real
  progress, bounded memory, testable logic.
- **AI layer isolated** behind `transcriber.ts`: swapping models or adding a
  server engine never touches the UI.
- **~0 € marginal cost** per user: the project scales on a free plan.

## Local development

```bash
npm install
npm run dev        # dev server
npm test           # unit tests
npm run build      # type-check + production build
npm run preview    # serve dist/
npm run test:e2e   # E2E (CHROMIUM_PATH=/path/to/chromium if needed)
```

## Environment variables

**None are required.** There are no keys or secrets.

| Variable | Purpose |
|---|---|
| `VITE_MODEL_HOST` | Alternative origin for the model weights, trailing slash included (e.g. `https://models.example.com/`). Unset, it uses the Hugging Face CDN. See *Self-hosting*. |

Analytics are Vercel Web Analytics + GoatCounter, both anonymous and
cookie-free.

## Self-hosting

Gate32 has no backend, so self-hosting it means serving static files:

```bash
git clone https://github.com/ilcapo32-blip/gate32
cd gate32
npm ci
npm run build          # produces dist/
# serve dist/ with nginx, Caddy, Docker, python -m http.server…
```

**To run with zero external calls (air-gapped)**, host the model weights too.
Download them once from Hugging Face (`onnx-community/whisper-base`, plus any
other sizes you want), serve them keeping the `{model}/resolve/main/{file}`
path, and build with:

```bash
VITE_MODEL_HOST=https://models.example.com/ npm run build
```

From then on nothing contacts a third party: no models, no analytics (delete
them if you like), no telemetry. The audio never left in the first place.

> Honest note on terminology: the public instance at gate32.autoritasai.com is
> **not "self-hosted"** — it's a static site we host that processes in your
> browser. What it *is* is **self-hostable**, with the steps above.

## Deployment

Vercel detects Vite automatically: `npm install && npm run build` → `dist/`.
Every push to `main` publishes to https://gate32.autoritasai.com.

## Current limitations

- Speed depends on the user's machine: with WebGPU (recent Chrome/Edge) it's
  several times faster than real time; without it, WASM works but is slow with
  the Accurate model.
- **No speaker diarization** and no summaries yet.
- Meeting capture needs desktop Chrome or Edge; Firefox and Safari don't allow
  capturing a tab's audio, and mobile browsers don't either. The button is
  hidden where it wouldn't work.
- Very long files (>~90 min) need comfortable memory; the app warns you.
- Safari/iOS works via WASM but without acceleration.

## Project docs

- [`RESEARCH.md`](RESEARCH.md) — market research, 20 opportunities, scoring
  matrix, competitive landscape and why this was chosen (Spanish).
- [`PRODUCT.md`](PRODUCT.md) — product thesis (Spanish).
- [`VALIDATION.md`](VALIDATION.md) — metrics, thresholds, experiments (Spanish).
- [`MONETIZATION.md`](MONETIZATION.md) — revenue hypotheses (Spanish).

## How this was built

Gate32 was built by its owner working with Claude, Anthropic's coding agent:
the owner drives product decisions, research and testing; the agent writes most
of the implementation. The commit history is public and co-authored, so you can
see exactly what that looked like.

The AI *inside* the product is OpenAI's Whisper (ONNX builds from
onnx-community) running client-side through transformers.js.

## License

MIT — see [`LICENSE`](LICENSE). The code is auditable on purpose: the privacy
promise ("your audio never leaves your device") is only worth something if
anyone can check it by reading the source.
