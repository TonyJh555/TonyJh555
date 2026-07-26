# Home banner images

The rotating banners on the home screen show a photograph when one exists, and
fall back to the painted gradient scene when they don't. **Add them one at a
time** — a half-finished set still looks deliberate, and the home screen never
breaks waiting for the rest.

## The easy way: upload in the admin console

**Admin → 🖼️ Content → Home banners → open a banner → ⬆ Upload a picture.**

Pick any photo. It is centre-cropped to the banner's 16:9 shape and shrunk
before it is stored, so **the layout cannot be broken by the wrong size** — a
tall portrait phone photo and a huge desktop export both come out as the same
960 × 540 frame. The preview above the button shows exactly what the customer
will see, dark gradient and headline included, before you publish.

The two things worth getting right are still yours: **keep faces in the top
half** (the words sit over the bottom), and check the picture reads well when
it's dark behind the text.

## The other way: files in the repo

For the four built-in banners, a file committed to `public/stories/` is picked
up automatically.

Drop them here, with exactly these names:

```
public/stories/elder-care.jpg      → "Your parents are never alone"
public/stories/happy-home.jpg      → "A home that simply works"
public/stories/worker-family.jpg   → "Every job feeds a dream"
public/stories/from-afar.jpg       → "Miles apart, hearts at ease"
```

The **name** is what matters, not the extension — `.jpg`, `.png`, `.webp` and
`.avif` all work, so use whatever your image tool exports.

Nothing else to change. A pre-build step (`scripts/story-manifest.mjs`) scans
that folder and the banner picks up whatever it finds on the next build — so on
Vercel, committing the file is all it takes.

## Size and framing

| | |
| --- | --- |
| Aspect | **16:9**, landscape |
| Size | **1280 × 720 px** (860 × 484 is the real display size on a phone; double it for retina) |
| Format | `.jpg`, quality ~80, **under 300 KB** — this is the first thing that loads on a 3G connection in a village |

**The bottom half is covered by text.** A dark gradient is laid over the lower
60% so the words stay readable. So:

- Put the **faces and the subject in the top two-thirds**.
- Leave the **bottom third simple** — a wall, a floor, sky, anything quiet.
- Avoid busy patterns at the bottom; the overlay will muddy them.
- Don't put anything you care about in the last 90 px — the CTA pill sits there.

## Prompts for an AI image tool

These are written for Midjourney / DALL·E / Firefly / Ideogram. Two things they
deliberately fight: generic "Indian" imagery that isn't Kerala, and the plastic
stock-photo look.

Append to every prompt: `--ar 16:9`, and if your tool supports it, ask for
photographic realism, natural window light, and no text in the image.

### 1. `elder-care.jpg` — Your parents are never alone

> Documentary photograph, Kerala home interior, warm late-afternoon light through
> a window. An elderly Malayali couple in their seventies sitting on a wooden
> chair and settee — the woman in a cream cotton saree with a thin gold border,
> the man in a white mundu and shirt. A younger woman in a simple nurse's uniform
> sits beside them, laughing with them, a hand resting gently on the older
> woman's arm. Red oxide floor, dark carved wood, a brass lamp, green leaves
> visible through the doorway. Candid, unposed, real skin texture, gentle
> depth of field. Subject in the upper two-thirds, plain floor in the lower
> third. No text.

### 2. `happy-home.jpg` — A home that simply works

> Documentary photograph, middle-class Kerala home, bright morning light. A
> family of four — parents in their thirties, a young girl, a boy — relaxed
> together on a sofa, genuinely laughing, the mother holding a coffee glass.
> Slightly out of focus in the background, a technician in a plain work shirt
> quietly finishing a job on a ceiling fan. Tiled floor, plants, a window with
> palm leaves outside. Candid, warm, real, unposed. Family in the upper
> two-thirds, uncluttered floor in the lower third. No text.

### 3. `worker-family.jpg` — Every job feeds a dream

> Documentary photograph, modest Kerala home at dusk, warm indoor light. A
> workman in his forties, still in his work shirt with a tool bag set down by
> the door, being greeted by his wife and two school-age children — one child
> hugging his waist. Real, joyful, unstaged. Simple painted wall, a calendar, a
> school bag on the floor. Honest dignity, not poverty imagery, not glamour.
> Family in the upper two-thirds, plain floor in the lower third. No text.

### 4. `from-afar.jpg` — Miles apart, hearts at ease

> Split-feeling documentary photograph. Foreground: an elderly Malayali woman in
> a Kerala home, seated by a window in soft daylight, smiling at a phone
> propped in front of her on a video call. Softly visible on the phone screen, a
> younger man in a shirt, somewhere abroad. Red oxide floor, brass lamp, green
> outside the window. Tender, quiet, real. Woman in the upper two-thirds, plain
> floor in the lower third. No text.

## Before you publish them

- **Never caption an AI person as a real KAAM worker or customer.** Aspirational
  scene-setting on the home screen is fine; "this is Rahul, our electrician"
  next to a generated face is not, and it's exactly the sort of thing that gets
  screenshotted.
- **Check the hands, the mundu and the saree.** Image models get South Indian
  clothing wrong constantly — a Malayali will spot a north-Indian dupatta or a
  wrongly-tied mundu instantly, and it undoes the whole "we're from here" pitch.
- **Look for a wedding ring, a bindi, a cross, a thread.** Kerala is Hindu,
  Muslim and Christian in roughly equal measure. Across the four banners, don't
  make everyone the same.
- Some app stores and ad platforms now want AI imagery disclosed. Worth
  checking before you run paid ads with these.

## The better version of this, later

Once you have your first ten real workers, photograph them and swap these out.
"These are our actual workers" beats any generated image, and for a
Kerala-only marketplace it *is* the pitch. You'll need a signed consent /
model release from each person — keep it simple and in Malayalam.

---

*The `public/stories/` folder ships empty on purpose — the painted banners are
the fallback until your images land.*
