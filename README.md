# wvw

### wide · vast · wild

**a desktop app that dances on your workspace.**
*your body is wider, vaster, wilder than this screen allows.*

`wvw /wɪv/, n.` — a desktop application by aru (anna rebecca unterholzner) · 2026 · [aarruu.com](https://aarruu.com)

---

## what is wvw?

wvw is a small creature that lives on your computer. While you work, at random and unannounced moments, a body appears on top of your screen. It dances, falls, rolls, lies around, goes upside-down, scales up, spins, and leaves trails that fade. Then it disappears again.

It arrives in one of **ten art styles**, from a thin ink line to a cloud of dust to a body typed out of characters. It never blocks your work: you can keep clicking and typing through it. And it always leaves when you ask: **press ESC**.

wvw is a somatic project. It is three things at once:

1. **a small dancing figure** that inhabits your screen while you work.
2. **a gentle sabotage of focused labour:** movement sequences that refuse efficiency and constraint.
3. **a reminder** that your body contains far more movement vocabularies than the three-to-five gestures typing demands.

## wide · vast · wild

The name is the premise, whispered into the machine:

- **wide:** the body takes up more space than the strip between keyboard and screen. The figure travels across the whole desktop and sometimes grows far beyond its frame.
- **vast:** the body knows far more than the gestures of work. wvw carries 15 movement vocabularies: rolling, falling, giving weight, being upside down, floating, shaking out, jittering.
- **wild:** the body does not ask permission. wvw arrives when it wants, moves in ways that are not useful, and leaves trails that fade.

## why this project?

> **research question**
> *What happens to a body that spends its days at a screen, when the screen itself starts to dance? Can a desktop application, the very tool that narrows us to ten fingers and a chair, become a site that reminds the body of how wide, vast and wild it is?*

Screen work shrinks the moving body to a handful of gestures: typing, clicking, scrolling, sitting still. wvw uses that same tool to whisper a different vocabulary of the body back to the person in front of it. It inhabits the space between work and play.

Further questions the project moves with:

- Can an interruption be an *invitation* rather than a distraction?
- What does a body on the screen awaken in the body in front of the screen: mirroring, laughter, a stretch, a pause?
- How can practices of contact improvisation (non-performing, non-violent body communication, rolling, falling, giving weight) be translated into a digital medium?
- Can a personal ritual of embodied freedom be scheduled, or does it have to arrive by surprise?

### lineage

- **motionlab / cologne** *(practice):* contact improvisation as movement-driven decision-making. A system of rolling, falling, being upside down, giving weight.
- **sondra perry** *(medium):* video, computer-based media and performance as ways to reflect critically on new technologies of the body. Digital tools as material to be pressed back against.

---

## how it operates

**choreographically**

- wvw waits in the background. At a random moment within the rhythm you choose (by default somewhere between 8 and 35 minutes), a body arrives.
- It picks one of the ten styles and moves through movement vocabularies from the moods you have invited. Every movement blends into the next, and the dance is never exactly the same twice.
- Gravity is real: whatever part of the body is lowest touches the floor. So it can stand, lie, roll, do a handstand or cartwheel along an invisible ground.
- Sometimes it suddenly grows huge (*bursts*), and sometimes two or three bodies arrive together (*chorus*).
- After the session length you chose (10 seconds up to "until ESC"), the body shrinks away and wvw waits for the next moment.
- At night the creature sleeps (*rest*, by default 22:00–07:00).

**the ten bodies**

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

**the four moods (movement vocabularies)**

- **grounded:** falling, rolling, lying around, crawling, leaning / weight-share, curling
- **playful:** jitter, bounce, shake-out, silly walk
- **upside-down:** spin, handstand, cartwheel
- **expansive:** sway, reach, float

**technically**

- built with **Electron** for **mac + windows**
- each arrival opens one transparent, click-through, always-on-top layer on the screen where your mouse is. It never takes focus, so you can keep working underneath it.
- the layer is closed as soon as the body leaves. Between arrivals only a small timer runs.
- the body is drawn live on a canvas: one skeleton, 15 procedural movement vocabularies, ten renderers.
- nothing is sent anywhere. Settings are stored locally on your computer.

---

## install

Download the latest version from the **[Releases](../../releases)** page.

**mac**

1. Download the `.dmg` for your Mac: `arm64` for Apple Silicon (M1/M2/M3/M4), `x64` for Intel.
2. Open it and drag **wvw** into **Applications**.
3. The first time only: wvw is not yet notarized by Apple, so right-click wvw in Applications → **Open** → **Open**.
   If macOS says the app is "damaged", open Terminal and run `xattr -cr /Applications/wvw.app`, then open it again.

**windows**

1. Download `wvw-…-windows-setup.exe` (installer) or `wvw-…-windows-portable.exe` (runs without installing).
2. If Windows SmartScreen appears: **More info → Run anyway**.

## activate

- **First launch:** the settings window opens, and a first small body says hello after a few seconds.
- After that, wvw lives quietly as a **small dancing figure in your menu bar** (mac, top right) or **system tray** (windows, bottom right; it may hide behind the `^` arrow).
- Click that figure to open the menu:
  - **dance now:** a body arrives immediately
  - **dance now as…:** choose one of the ten styles
  - **interruptions on:** tick to let bodies arrive by themselves at random moments
  - **settings…:** rhythm, session length, styles, moods, size, bursts, chorus, rest, start at login
- To have wvw always running, tick **start wvw when I log in** in settings.

## close

| you want to… | do this |
|---|---|
| end the current dance | press **ESC** (or menu → *reclaim my screen*) |
| take a break for an hour | menu → **pause for an hour** |
| stop the random arrivals but keep wvw | menu → untick **interruptions on** |
| quit wvw completely | menu → **quit wvw** |
| uninstall | mac: drag wvw from Applications to the Bin · windows: Settings → Apps → wvw → Uninstall |

*press ESC anytime to reclaim your screen.*

---

## for developers

```bash
npm install
npm start
```

To see a body immediately while developing:

```bash
WVW_DANCE_NOW=sumi npm start          # mac / linux
set WVW_DANCE_NOW=sumi && npm start   # windows cmd
```

| file | what it does |
|---|---|
| `main.js` | the rhythm of interruptions, rest periods, ESC, tray menu, settings storage |
| `src/engine/body.js` | the skeleton, 15 movement vocabularies, choreography, gravity, bursts |
| `src/engine/styles.js` | the ten ways of drawing that body |
| `src/engine/stage.js` | runs bodies on a canvas (desktop overlay + previews in settings) |
| `src/settings.*` | the settings window |

### releasing a new version

1. Raise `"version"` in `package.json` (e.g. `0.2.0`) and commit.
2. `git tag v0.2.0 && git push --tags`
3. GitHub Actions (`.github/workflows/release.yml`) builds the mac `.dmg`s and windows `.exe`s and publishes them as a Release (~10 minutes).

Builds are currently unsigned. To remove the first-open warnings later, add an Apple Developer ID and a Windows code-signing certificate as repository secrets (`CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`).

---

wvw · a desktop application by aru · 2026 · MIT license
*for reading. for looking. for moving.*
