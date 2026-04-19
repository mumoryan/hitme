<img width="640" height="360" alt="image" src="https://github.com/user-attachments/assets/14c24c54-c6fe-42a9-9bd8-a155d42e12bb" />

# ✨ Hitme

A motivational quotes app for [Even Realities G2](https://www.evenrealities.com/) AR glasses.

✨ Say “Hey Even, hit me!” to get a quote  
✨ Add context for more relevant responses  
✨ Or let Hitme use your calendar for situational quotes  

Built using the Even App WebView bridge, rendering text on the G2 display via `@evenrealities/even_hub_sdk`.

## Requirements

- Node.js `^20` or `>=22`
- An Even Realities account (for publishing via `evenhub pack`)
- G2 glasses paired with the Even App (for on-device testing)

## Install

```bash
npm install
```

The simulator binary must be on your PATH. It's already a devDependency here, so `npx evenhub-simulator` works. If you'd rather run it as a bare command:

```bash
npm install -g @evenrealities/evenhub-simulator
```

## Run

### Simulator (primary dev loop)

```bash
npm run sim
```

This boots two processes via `concurrently`:

1. **Vite dev server** at `http://localhost:5173` — serves your web app
2. **evenhub-simulator** — opens two windows:
   - a **browser-like window** simulating the Even App WebView on the phone (where `src/*.ts` runs)
   - a **glasses display window** simulating the G2 render target (what SDK calls like `createStartUpPageContainer` paint)

Hitting `Ctrl+C` tears both down (`-k` flag).

### Vite only

```bash
npm run dev
```

Plain Vite at `http://localhost:5173`. The SDK will hang at `waitForEvenAppBridge()` because there's no host to respond — useful only for DOM/CSS work that doesn't touch the glasses.

### On-device testing

```bash
npm run dev        # keep vite running
npx evenhub qr     # generate QR code
```

Scan the QR with the Even App to load your dev server in the real WebView against real glasses.

## Build & Pack

```bash
npm run build                    # tsc + vite build → ./dist
npx evenhub pack app.json ./dist # produces out.ehpk for submission
```

(You'll need an `app.json` — run `npx evenhub init` to scaffold one.)

## Project structure

```
src/
  main.ts       # entry — wires styles and the glasses UI module
  test.ts       # current glasses UI: renders a text container
  style.css     # phone-side WebView styles
  counter.ts    # scratch / unused
public/         # static assets served by Vite
index.html      # Vite HTML entry
```

## Stack

- [Vite](https://vitejs.dev/) — dev server + bundler
- TypeScript
- [`@evenrealities/even_hub_sdk`](https://www.npmjs.com/package/@evenrealities/even_hub_sdk) — bridge SDK to the Even App / glasses
- [`@evenrealities/evenhub-cli`](https://www.npmjs.com/package/@evenrealities/evenhub-cli) — login, pack, QR codes
- [`@evenrealities/evenhub-simulator`](https://www.npmjs.com/package/@evenrealities/evenhub-simulator) — local simulator for the WebView + glasses display

## Feature map

_TBD_
