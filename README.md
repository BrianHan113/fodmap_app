# FODMAP Helper

A personal low-FODMAP diet companion that runs in the browser and installs to your phone's home screen as an app (PWA). It works offline, and all data stays on your device.

- **Food guide.** About 326 foods with low / moderate / high serving sizes and the FODMAP groups behind each rating. You can edit foods or add your own.
- **Diary.** Log meals by picking foods and portions. It shows a live per-FODMAP load and warns when moderate servings stack up. You can also log symptoms (0–10), Bristol stool type, and a daily check-in (mood, stress, sleep, exercise, water, notes).
- **Three phases.** Elimination with a day counter and readiness check. Reintroduction with guided 3-day challenges per FODMAP group, automatic scoring against your baseline, and washout timers. Personalization, where the food guide is marked by your own results.
- **Insights.** Symptom and stress trends, lifestyle factors, how symptoms follow each food, stool types, and your tolerance map.
- **Export for AI.** Pick a date range and copy, share or download your diary with a ready-made prompt, then paste it into ChatGPT, Claude, Gemini or similar to get a summary, patterns and suggested adjustments.
- **Backup.** Export and import all data as JSON from Settings.

> Serving thresholds are approximations compiled from public Monash University / FODMAP Friendly information. The official Monash FODMAP app is the reference. This is not medical advice.

## Install on Android

1. Open `https://<your-github-username>.github.io/fodmap_app/` in Chrome.
2. Tap the menu (⋮), then **Add to Home screen** or **Install app**.
3. Launch it from the home screen. It opens full-screen and works offline.

Export a backup from Settings every so often. Clearing Chrome's site data deletes the app's data.

## Develop

```bash
npm install
npm run dev       # dev server
npm test          # unit tests (FODMAP logic, phases, challenges, backup)
npm run build     # production build in dist/
npm run preview   # serve the build at http://localhost:4173/fodmap_app/
```

Pushing to `main` builds, tests and deploys to GitHub Pages through `.github/workflows/deploy.yml`.

## Structure

- `src/data/foods.ts`: the food table (compact tier syntax, documented at the top of the file)
- `src/data/challenges.ts`: the reintroduction protocol and test foods
- `src/lib/`: pure logic (FODMAP load and stacking, phases and readiness, challenge scoring, personal tolerance, correlations, backup)
- `src/db/`: IndexedDB schema (Dexie) and React hooks
- `src/pages/`: screens
