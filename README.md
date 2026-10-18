# VANTOR Automotive

A local cinematic automotive concept showroom built with React, TypeScript,
Vite, Tailwind, GSAP/ScrollTrigger/Flip, Lenis, and Lucide React.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173).

## Build and checks

```bash
npm run build
npm test
npm run preview
```

The test suite checks collection filters and sorting, discovery recommendations,
enquiry validation, source frame assets, reversible rendering and bounded cache,
static section order/anchors, and Lenis ticker/cleanup/reduced-motion behavior.
It does not replace real-browser visual or interaction tests.

## Implemented interactions

- Temporarily pinned, reversible scroll-controlled hero; coordinated text phases.
- Featured Porsche GT3 reveal and staggered specification labels.
- Six-car collection, category filters, numeric price/name sorting, GSAP Flip.
- Animated native vehicle dialog with Escape/backdrop close and enquiry preselection.
- Three-preference “Find Your Drive” recommendation experience.
- Scroll-revealed editorial, background transition and image parallax.
- Dedicated landing-page paragraph with reversible, word-by-word scroll highlighting.
- Philosophy heading in normal document flow, with a moving editorial image gallery.
- Reversible masked heading lines across Collection, Philosophy, Discovery, and Contact.
- Individually revealed collection photos, with separate scroll and pointer transforms.
- Alternating philosophy image masks, depth movement, and scroll-drawn red dividers.
- Scroll-driven GT3 numeric counters, preserving exact accessible specifications.
- Discovery bento expansion on scroll, image wipes and staggered copy on selection.
- Thin page-progress indicator, scroll-reactive marquee drift, animated FAQ/draft feedback.
- Pointer-following image affordances and magnetic buttons on fine mouse pointers.
- Animated mobile navigation, working section links, and smooth back-to-top.
- Validated enquiry draft with copy/download; no backend submission.

## Hero media

The user-supplied MP4 is at public/videos/vantor-hero.mp4. Its actual clip duration
is approximately 5.17 seconds, not the four seconds in the brief.

Scroll playback uses all 124 extracted WebP frames on canvas. The desktop and phone
sets live at public/videos/hero-frames/desktop and /mobile. Once the poster is
ready, frame zero is downloaded, decoded, and painted before the canvas appears.
Only the selected device set downloads. Its complete compressed sequence then
loads in the background with four desktop or three phone requests in parallel.
Compressed frames stay in memory for reverse playback; decoded images are limited
to a directional window of sixteen desktop or ten phone frames, with up to three
desktop or two phone decodes at once. Hidden tabs pause new requests.

Each screen refresh paints only the next consecutive source frame toward the
current scroll destination. Missing frames hold the displayed image until ready.
GSAP text follows the frame actually painted, including reverse playback. The
phone scroll track reserves more distance for the complete sequence. The canvas
starts at a 1.5× density cap, bounded by the exported frame dimensions. The
original MP4 remains as a source asset but is never played or sought by the site.
The poster remains visible when canvas or bitmap decoding is unavailable.

The opening extracted frame appears immediately. Reduced-motion and detected
data-saving / 2G connections use that static presentation without sequence
downloads. Normal mobile visitors use the mobile sequence and shorter pin.

Phone frames were re-exported from the original 2560 × 1440 upload by scaling
to 1920 × 1080 and cropping the hidden sides to 840 × 1080. The crop preserves
the source pixels visible on phones and small tablets. WebP quality stays at 92;
the phone sequence shrank from 7.77 MB to about 5.17 MB. Both canvas variants
cap density at 1.5×, bounded by their source dimensions; desktop stays at
1600 × 900. The phone URLs use version 4 to bypass the older browser cache.

Replacing the video also requires regenerating both frame sequences and updating
HERO_FRAME_COUNT in src/lib/heroSequence.ts.

## Fictional inventory and inquiry

All six listings, years, and USD asking prices are example data, not availability
or live offers. Photos illustrate models, not specific advertised inventory.
The featured 2022 US-market Porsche 911 GT3 PDK figures link to Porsche Newsroom.

The inquiry form only prepares text in memory to copy or download. It does not
send, store, book, or reserve anything. Connect a real inventory feed and contact
backend, replace clearly labeled contact/social placeholders, and confirm media
rights before commercial deployment.

## Motion behavior

The new page-wide choreography lives in src/lib/pageMotion.ts and runs inside
the App's scoped GSAP matchMedia context. Scrolling forward and backward controls
heading masks, gallery transitions, rules, and counters; no additional section
is pinned. Desktop uses stronger lateral/depth movement; mobile removes lateral
gallery drift and uses smaller scale changes. Reduced motion skips this layer,
restores true numeric figures, and leaves headings/images fully visible.

The 28 checks include mocked choreography configuration, reversible decimal
counters and text cleanup, mobile movement limits, and accessible static output.
An additional jsdom integration check mounts the actual React/GSAP code in
Strict Mode, loads hero metadata after mount, resolves fonts later, drives
forward/reverse native scroll with simulated geometry, and checks teardown.
They do not establish real-browser timing, layout, or animation performance.
Additional renderer checks cover nearest-ready drawing with delayed decodes,
reserved target capacity, obsolete completion disposal, bounded network priority,
direction reversals, mobile limits, and avoiding redundant canvas resize clears.

Section contexts rebuild when delayed hero pin setup or font readiness changes
layout. The featured image/specs, philosophy text, collection cards, and initial
discovery wipe now use their own scroll-driven entrance instead of completing
before those elements become visible. Reveal ranges are deliberately longer.

## Credits and audit

Photo credits and licensing are in public/IMAGE-CREDITS.md and linked from the
footer. The GT3 photo is by MrWalkr, Wikimedia Commons, CC BY-SA 4.0.

BRIEF-AUDIT.md compares the implementation to the full 16-section attachment
and records remaining verification limits. Browser access was declined in this
chat, so real-browser layout, playback, focus, and console QA is not claimed.
