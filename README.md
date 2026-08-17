# 💪 Fit For Life

**Train anywhere. Transform everywhere.** Your personal world-class trainer — for every body, every goal, any location. No subscriptions, no accounts, no servers. Open it in a browser and start.

**Live app:** enable GitHub Pages on this repo (see [Deployment](#-deployment)) and it runs at `https://<your-username>.github.io/Fit-For-Life/`

---

## ✨ What the app does

1. **Profile onboarding** — name, age, gender; female users are additionally asked whether they are currently pregnant or recently a mother.
2. **Goal selection** — Weight Loss, Strength, or Weight Loss + Strength combo.
3. **Training location** — Commercial gym / Home (medium) gym / No equipment at all.
4. **Days per week** — 3, 4, or 5 day programs.
5. Tapping a day opens a **workout preview** — see all exercises, adjust sets with a ± stepper, edit target reps, watch demos, and swap exercises. The session clock and stats begin **only when the user presses START WORKOUT**. The plan then runs in a **Gymverse-style one-exercise-at-a-time workout player** ("EXERCISE 1/6" with a live Time · Volume · Reps stats bar), with:
   - 🎥 An embedded close-up **video demo** for every exercise (pinned, embed-verified YouTube IDs)
   - 🎯 **Target-muscle focus** tags (primary + secondary)
   - ✅ Pro **coaching cues** for perfect form
   - ⚖️ **Weight-entry guidance** per equipment type (include the 20 kg/45 lb bar for barbells, log ONE dumbbell's weight for dumbbell moves, log the stack number for machines/cables)
   - 📝 **Set-by-set logging** (weight × reps, or seconds for timed moves) with a ➕ **Add another set** button (carries your last weight forward) and a **KG ⇄ LB unit toggle**
   - ⏱ An automatic full-screen **rest timer** (with +15s / skip) after every completed set — **wall-clock based**, so it stays accurate even if the phone is locked or the app is backgrounded
   - 🔄 **Up to 6 alternative exercises** per movement (same muscle, equipment- and safety-aware) — **watch the demo video first**, then tap "Yes, swap to this" or keep browsing; completed sets are preserved across swaps
   - 🎲 A **"New Mix"** shuffle button and **automatic weekly rotation** so workouts never go stale
6. **Progress tracking** — day streak, total workouts, training volume, weekly calendar strip, personal bests, and complete history.
7. **Prenatal & postpartum programs** — dedicated, curated, safety-first plans (breathing, pelvic floor, core-restore, gentle strength), only using exercises flagged safe for that stage.
8. **Privacy by design** — every byte of data stays in the user's browser (`localStorage`). Nothing is uploaded anywhere. Progress resumes automatically in the same (non-incognito) browser.
9. **Dark & light themes** — toggle from the dashboard (☀️/🌙) or Profile → Preferences; maternity-specific safety notes are shown only to the users they apply to.
9. **PWA-ready & offline-capable** — a service worker caches the app shell; users can "Add to Home Screen" on iOS/Android and it behaves like a native app.

---

## 🧠 How it works (architecture)

**Zero-dependency vanilla stack.** No frameworks, no build step, no npm. This was deliberate: it makes the app instantly deployable on GitHub Pages, reviewable by any human or AI model, and trivially portable to a native wrapper (Capacitor/Cordova) later for App Store / Play Store releases.

```
index.html            App shell: loads fonts, CSS, the 3 JS modules, registers the service worker
manifest.webmanifest  PWA manifest (installable on mobile home screens)
sw.js                 Service worker — cache-first offline support for the app shell
css/
  styles.css          Full design system: dark premium theme, cards, buttons, timer ring,
                      onboarding, dashboard, workout, progress & profile screens (mobile-first)
js/
  data.js             EXERCISE DATABASE — 201 exercises. Each has: id, name, target muscles,
                      equipment tier (gym/min/body), type (compound/isolation/core/cardio/
                      mobility/recovery), a pinned verified YouTube video id (vid) + a search
                      query fallback (v), coaching cues, and preg/post safety flags + notes.
  plans.js            PLAN ENGINE — turns a profile into a weekly program:
                      • Splits: 3-day full-body, 4-day upper/lower, 5-day PPL-style
                      • Separate female split variants with extra glute/lower-body emphasis
                      • Goal schemes: sets/reps/rest per exercise type (loss = high-rep short-
                        rest + cardio finishers; strength = heavy + long rest; combo = hybrid)
                      • Curated PRENATAL_SPLIT / POSTPARTUM_SPLIT templates (safety > variety),
                        auto-substituted if the user lacks equipment
                      • Seeded PRNG (mulberry32) → deterministic but rotates variety by ISO
                        week number and a user-triggered "variant" (New Mix button)
                      • TAG_FALLBACKS guarantee 6–8 exercises/day even in tiny pools
                        (e.g. bodyweight-only biceps day)
  app.js              APP LOGIC — single-page renderer with 5 screens (onboard, dashboard,
                      workout, progress, profile), localStorage persistence, set logging,
                      the rest-timer overlay (SVG ring + WebAudio beeps), streak/volume/PB
                      calculations, confetti celebrations, and toast notifications.
```

### Data model (localStorage key `ffl_state_v1`)

```js
{
  profile: { name, age, gender, maternity, goal, equip, days },
  variant: 0,                    // bumped by the "New Mix" shuffle
  logs: {                        // one entry per completed workout day
    "2026-08-16": { dayIndex, dayName, sets: { exId: [{w, r}] }, volume, ts }
  },
  activeSession: {               // in-progress workout — survives page refresh
    dayIndex, date, sets: { exId: [{w, r, done}] }
  }
}
```

### Key design decisions

| Decision | Why |
|---|---|
| Vanilla JS, no build | Deploys as-is on GitHub Pages; any AI/human can review & extend without tooling |
| `localStorage` only | User asked for zero server-side anything; progress resumes per-device/browser |
| YouTube embeds via **pinned, verified video IDs** (`vid` field per exercise, `youtube-nocookie.com`) | YouTube removed search-playlist embeds; every ID was verified embeddable via oEmbed at build time. Exercises without a `vid` fall back to opening a YouTube search |
| Videos load on tap only | Keeps the page fast and data-friendly on mobile |
| Seeded PRNG for plans | Plans are stable within a week (log against the same workout) yet rotate weekly |
| Curated maternal templates | Pregnancy/postpartum safety is never left to random selection |
| Equipment tiers are **preference-ordered** (gym → dumbbell → bodyweight) | Commercial-gym plans are ~99% gym-based content (machines/barbells/cables); lower tiers are used only when a muscle has no fresh option left |

---

## 🩺 Safety notes (important)

- Prenatal/postpartum programs only draw from exercises explicitly flagged `preg`/`post` in `js/data.js`, favor breathing, pelvic-floor and core-restore work, and show inline safety notes.
- The onboarding explicitly advises users to get a doctor's clearance before training during pregnancy or postpartum.
- This app provides general fitness guidance, not medical advice.

---

## 📊 Analytics

The app uses [GoatCounter](https://www.goatcounter.com/) — free, open-source, privacy-friendly (no cookies, GDPR-compliant, counts unique daily visitors without tracking individuals).

- **Dashboard:** https://fitforlife.goatcounter.com — daily/weekly/monthly visitors, unique visits, pages, referrers, countries, devices & browsers.
- **How it's wired:** the loader script in `index.html` counts initial page loads; because this is a single-page app, `trackView()` in `js/app.js` also logs every screen change (`/dashboard`, `/workout`, `/progress`, `/profile`) via `window.goatcounter.count()`.
- **Milestone events:** `profile-created` (new user finished onboarding) and `workout-finished` (a workout was completed) appear in the dashboard as events — the truest measure of *active* users, not just visitors.
- Workout data itself never leaves the user's device; only anonymous page-view pings go to GoatCounter.

---

## 🚀 Deployment

The app is 100% static — GitHub Pages hosts it for free:

1. Push this repository to GitHub (branch `main`).
2. Repo **Settings → Pages → Source**: select **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Wait ~1 minute. The app is live at `https://<username>.github.io/Fit-For-Life/`.
4. On a phone, open that URL → browser menu → **Add to Home Screen** for the full-screen app experience.

No build step, no CI needed. Any commit to `main` redeploys automatically.

### Run locally

```bash
# any static server works; e.g.:
python3 -m http.server 8080
# then open http://localhost:8080
```

(Opening `index.html` directly via `file://` also works, except the service worker.)

---

## 🧪 How it was validated

- `node --check` syntax validation on all JS modules.
- A generator test harness exercised **all 324 profile combinations** (gender × maternity × goal × equipment × days × multiple weeks) asserting: correct day counts, 6–8 exercises/day, no duplicate exercises within a day, valid set/rep/rest schemes, **equipment access always respected**, **only safety-flagged exercises in prenatal/postpartum plans**, weekly variety, and deterministic reproducibility.
- An end-to-end UI flow simulation (DOM shim in Node) walked: onboarding → dashboard → open workout → log sets → rest timer trigger → finish workout → volume/streak/PB math → localStorage persistence → pregnant-profile plan safety.

---

## 🗺 Roadmap (native releases)

The codebase is intentionally wrapper-ready:

1. **Phase 1 (done):** Browser/PWA release via GitHub Pages — installable on any mobile device.
2. **Phase 2:** Wrap with [Capacitor](https://capacitorjs.com/) → App Store + Play Store builds from this exact codebase (swap `localStorage` for Capacitor Preferences for extra durability).
3. **Ideas:** exercise substitution swaps, rep-tempo coaching, progressive-overload auto-suggestions from logged history, body-measurement tracking, export/import progress as a file.

---

## 🛠 For future maintainers (human or AI)

- **Add an exercise:** append one object to `EXERCISES` in `js/data.js` (follow the documented shape at the top of the file). It becomes instantly eligible for plan generation.
- **Add/change a split:** edit `SPLITS` / `SPLITS_FEMALE` in `js/plans.js` — each day is a list of muscle-tag slots.
- **Change goal programming:** edit `GOAL_SCHEMES` (sets/reps/rest per exercise type per goal).
- **Add a screen:** add a `render*()` function in `js/app.js` and wire it into `render()` + the bottom nav.
- **Bump the service-worker cache** (`CACHE` constant in `sw.js`) whenever you change static assets.

Everything is plain ES2020 in three readable files. No hidden magic.

---

Made with 💜 by **Jayavardhan Tummidi** — *Fit For Life: where is this app dropped from the sky?* 😉
