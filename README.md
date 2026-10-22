# vvw

**a desktop app that dances on your workspace.**
*your body is wider, vaster, wilder than this screen allows.*

vvw lives quietly in your menu bar / system tray. At random moments it interrupts your screen: a small body arrives on a transparent, click-through layer and dances, falls, rolls, lies around, spins upside-down, then leaves. Each arrival is drawn in one of ten art styles.

It is a somatic project: a gentle sabotage of focused labour, and a reminder that your body holds far more movement vocabularies than the three-to-five gestures typing demands.

**press ESC anytime to reclaim your screen.**

— aru · anna rebecca unterholzner · [aarruu.com](https://aarruu.com)

---

## ten bodies

| | style | |
|---|---|---|
| 01 | **ink** | a thin line, almost nothing |
| 02 | **marey** | chronophotograph, 1882: white lines and joint-dots, every pose remembered |
| 03 | **ribbon** | hands and feet write luminous trails |
| 04 | **scribble** | pencil, boiling on threes |
| 05 | **pixel** | low resolution, high spirit |
| 06 | **ascii** | a body typed, not drawn |
| 07 | **dust** | a body of particles that arrives late |
| 08 | **cutout** | cut paper, pinned and unpinned |
| 09 | **sumi** | brush and ink, an ensō for a head |
| 10 | **smear** | the gesture, dragged through glass |

## four moods (movement vocabularies)

- **grounded:** falling, rolling, lying around, crawling, leaning / weight-share, curling
- **playful:** jitter, bounce, shake-out, silly walk
- **upside-down:** spin, handstand, cartwheel
- **expansive:** sway, reach, float

All styles share one body, so every style speaks every vocabulary. Movement is procedural and never repeats exactly. Gravity is real: whatever part of the body is lowest touches the floor.

## settings

Open **settings…** from the tray icon:

- **rhythm:** how often a body arrives (e.g. somewhere between 8 and 35 minutes)
- **session:** how long it dances, from a 10-second burst to "until ESC"
- **styles + moods:** which bodies and vocabularies are invited
- **body:** size, sudden scale *bursts*, and *chorus* (sometimes 2–3 bodies arrive)
- **rest:** the creature sleeps at night, no movement
- **start at login**

The tray menu also has *dance now*, *dance now as…* (pick a style), and *pause for an hour*.

---

## install (for people)

Download from the [Releases](../../releases) page.

- **mac:** the `.dmg` for your chip (`arm64` = Apple Silicon, `x64` = Intel). vvw isn't notarized by Apple yet, so the first time: right-click vvw in Applications → **Open** → **Open**. If macOS says it's "damaged", run `xattr -cr /Applications/vvw.app` in Terminal.
- **windows:** `vvw-…-windows-setup.exe` (installer) or `…-portable.exe` (no install). If SmartScreen appears: **More info → Run anyway**.

vvw has no window when it starts. Look for the small dancing figure in the menu bar (mac) or system tray (windows).

## develop

```bash
npm install
npm start
```

To see a body immediately while developing:

```bash
VVW_DANCE_NOW=sumi npm start        # mac / linux
set VVW_DANCE_NOW=sumi && npm start # windows cmd
```

## publish a release on GitHub

1. Create a repo and push this folder:
   ```bash
   git init && git add . && git commit -m "vvw 0.1.0"
   git branch -M main
   git remote add origin https://github.com/<you>/vvw.git
   git push -u origin main
   ```
2. Tag a version and push the tag:
   ```bash
   git tag v0.1.0
   git push --tags
   ```
3. GitHub Actions (`.github/workflows/release.yml`) builds the mac `.dmg`s and windows `.exe`s and attaches them to a new Release. Takes ~10 minutes. For the next version, bump `"version"` in `package.json` and tag again.

You can also run the workflow by hand (Actions → release → Run workflow) to get test builds as downloadable artifacts without making a release.

### signing (optional, later)

Builds are unsigned, which is why mac/windows show a warning on first open. To remove it you need an Apple Developer ID (mac) and a code-signing certificate (windows). electron-builder picks them up from `CSC_LINK` / `CSC_KEY_PASSWORD` (and `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` for notarization) as repository secrets.

## how it works

- **electron**, one transparent, click-through, always-on-top window per arrival, on the screen where your cursor is. It never takes focus and is destroyed when the body leaves, so nothing runs between arrivals except a timer.
- `src/engine/body.js`: the skeleton, the 15 movement vocabularies, choreography (blending one movement into the next), gravity, bursts
- `src/engine/styles.js`: the ten ways of drawing that body
- `src/engine/stage.js`: runs bodies on a canvas (the desktop overlay and the live previews in settings)
- `main.js`: the rhythm of interruptions, rest periods, ESC, tray, settings storage

## lineage

- **motionlab / cologne:** contact improvisation as movement-driven decision-making: rolling, falling, being upside down, giving weight.
- **sondra perry:** video, computer-based media and performance as ways to reflect critically on new technologies of the body.

MIT license.
