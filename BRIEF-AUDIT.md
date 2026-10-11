# VANTOR full-brief audit

## Why the earlier build was incomplete

The original saved attachment in directory 35668778-c0a2-4d43-9659-67511dc7068b
ends during section 3, immediately after the video loop-boundary requirement.
The replacement attachment in fb5ff10b-187b-4827-b48f-56231e58039d contains
all 16 sections. The initial implementation added a basic showroom, but did not
flag the missing remainder clearly enough. An intermediate correction also
misread “interactive UI” as enquiry workflows rather than the requested motion
and discovery experience.

This audit now uses the full replacement brief.

## Implementation against each section

1. **Technology:** React, Vite, TypeScript, Tailwind, GSAP, ScrollTrigger,
   Lenis, and Lucide React are used. No Three.js or additional runtime library.
2. **Brand:** Near-black #080808 / #111111, white and silver Geist typography,
   restrained red, thin rules, large spacing, and original editorial composition.
   The user reference influences atmosphere, not copied content.
3. **Hero:** The supplied local clip is scroll controlled, never autoplayed.
   Its actual duration is read after loadedmetadata for MP4 seeking. The smooth
   path renders all 124 source-video frames on canvas, with a bounded decoded
   cache and smaller mobile assets. The shared GSAP timeline controls frames
   and text in both directions. Pin distance is 160% desktop / 110% mobile,
   then releases into Featured. Opening frame is immediately available as a
   static fallback. Reduced motion, Save-Data, and detected 2G use a static
   presentation without sequence or MP4 downloads. Requested label, heading,
   supporting text, both CTAs, and scroll indicator are present. Hidden hero
   CTAs become inert during the latter part of the scrub.
4. **Navigation:** Collection / Our Story / Experience / Contact anchors.
   Transparent hero navigation transitions to near-solid dark after scrolling.
   Underline hover, GSAP mobile disclosure animation, selection and Escape close,
   explicit focus styles, and no closed-menu tabbable links.
5. **Featured vehicle:** Directly after Hero, before the marquee. Black 992.1
   Porsche 911 GT3, fictional 2022 US-market PDK showcase. Clip reveal,
   scroll scale, text entrance, staggered spec labels, and functional Explore
   button. Manufacturer-source link verifies 502 hp, 3.2 s 0–60 mph, and
   197 mph top track speed for this variant. Photo has visible CC BY-SA credit.
6. **Collection:** Six models with distinct local photographs, category, model
   year, illustrative USD price, engine, transmission, and drivetrain.
   All Vehicles / Performance / Luxury / Supercars filters each have results.
   Price ascending / descending and Name A–Z sort actual data. GSAP Flip
   animates layout changes and new cards enter visibly. Shared native dialog
   has animated entrance/exit, larger photo, full details, preselected enquiry
   CTA, focus trapping/restoration, Escape/backdrop close, body scroll lock,
   and contained scrolling. All inventory is explicitly fictional.
7. **Editorial:** NOT JUST A CAR. / AN EXPERIENCE. Word-by-word scrub reveal,
   subtle background transition, and restrained accompanying image parallax.
   No extra long full-page pin. A dedicated statement after the featured car
   additionally highlights a complete paragraph word by word, from muted grey
   to white, forward and backward with scroll. It stays readable and unpinned.
   Under reduced motion, the whole statement is fully highlighted immediately.
8. **Philosophy:** BEYOND THE ORDINARY. Three requested pillars and statements.
   The middle pillar offsets and reverses image/text placement. Thin animated
   dividers and desktop image motion accompany the gallery. The heading now
   stays in normal flow on every viewport: its earlier long-running GSAP pin
   was removed after the user reported the heading feeling stuck on screen.
9. **Discovery:** FIND YOUR DRIVE. Three accessible, active-state preference
   controls: Performance / Luxury / Everyday refinement. Each selects a
   distinct actual record from shared inventory. Recommendation image and
   copy animate, controls expand horizontally on desktop, and choices stack
   on mobile. The result bento is gapless: 7 columns x 2 rows plus two 5-column
   cells = 24 cells, exactly filling a 12-column x 2-row grid.
10. **Inquiry:** YOUR NEXT CHAPTER STARTS HERE. Full name, email, preferred
    vehicle, message, and optional phone/date. Field-level validation,
    aria-invalid/describedby, error announcement and first-error focus.
    Successful validation prepares a copyable/downloadable draft, explicitly
    NOT sent or stored. No backend or appointment is falsely claimed.
    Fictional contact placeholders use .example and a fictional phone number.
11. **Footer:** Wordmark, statement, working section navigation, Lucide social
    links marked as placeholder destinations, copyright, photo license link,
    and smooth back-to-top with native reduced-motion fallback.
12. **Lenis:** Reusable top-level hook owns one GSAP ticker. No second RAF loop.
    Scroll events update ScrollTrigger; listener, ticker, and instance cleanup
    is idempotent and Strict-Mode-safe. Modal opening suspends scrolling;
    forms/nested dialog areas are excluded. Runtime reduced-motion changes
    switch this hook to native scrolling. Layout refreshes occur after
    collection/discovery changes, image loads, and font readiness.
13. **GSAP:** React-scoped contexts, shared hero timeline, component-local
    featured/menu/dialog animations, collection Flip, editorial reveal/parallax,
    philosophy media motion, word-highlight statement, and footer entrance. Only
    the hero remains pinned. Hover physics only on a fine
    mouse pointer. No persistent will-change or image opacity-darkening exits.
14. **Responsive:** Responsive type, desktop 3-column collection, tablet
    2-column and mobile 1-column collection, mobile discovery stack, cover
    cropping, tappable controls, compact dialog, shorter hero pin, static
    data-saving presentation. Browser layout verification remains outstanding.
15. **Quality:** Local image/error fallbacks, semantic controls, keyboard
    behavior, reduced-motion branches, metadata, favicon, no logging calls,
    honest placeholder labeling, credits and image licenses.
16. **Verification:** Production compilation, automated logic/static-render
    tests, source review, and HTTP asset checks completed. Actual browser
    scrolling, focus behavior, visual layouts, and console inspection have
    NOT been verified: browser access was declined earlier in this chat.

## What verification proves

- Production build: TypeScript and Vite succeed.
- Automated tests: six records and valid local JPEG assets; all filter/sort
  combinations; three distinct recommendations; enquiry validation/draft;
  complete desktop/mobile frame sequences; forward, reverse, rapid frame
  changes and cache disposal; static section order and navigation anchors;
  no hero autoplay; single Lenis ticker, modal suspension, idempotent cleanup,
  Strict Mode reinstall, and native reduced-motion switching.
- HTTP: localhost:5173 serves page, changed collection source, all six photos,
  MP4, mobile ending frame, and favicon with appropriate content types.
- These are not browser interaction or visual tests. Desktop/mobile rendering,
  real-device decode performance, hero pin release, GSAP Flip positioning,
  menu timing, dialog focus/backdrop, and browser console still need browser QA.

The additional statement and philosophy correction have source/static-render
regression checks for every highlightable word, an accessible full sentence,
scoped scrub configuration and reduced-motion handling, and absence of a
philosophy heading pin.

## Expanded animated UI pass

The user clarified that “interactive UI” meant much more animated UI and
scroll-driven motion, not additional comparison/shortlist workflows. This pass
adds masked, line-by-line scrubbed headings to Collection, Philosophy, Discovery,
and Contact; stronger masked editorial words; individual collection photo masks
and scale choreography; alternating philosophy image entrances and depth movement;
scroll-drawn red rules; reversible GT3 numerical counters; a thin page-progress
indicator; scroll-reactive marquee drift; a discovery bento reveal, directional
recommendation image wipes and staggered copy; and FAQ/draft/arrow feedback.

No new pins, images, libraries, or data features were added. The hero renderer
is unchanged. Image motion never dims photographs on exit. Scroll transformations
and pointer-image transformations use separate wrappers. The new page layer is
scoped to the App's GSAP context and reduced-motion matchMedia branch, with a
lighter mobile movement profile and no additional animation loop. Counter cleanup
restores actual figures; screen readers always receive the exact original values.

Production build and 23 automated checks pass. Added tests use mocked GSAP to
inspect choreography, mobile movement limits, no-pin/no-darkening configuration,
counter reversal/rounding/cleanup, plus static accessible heading/counter output.
These checks do not establish real-browser animation timing or appearance.

## Fresh-load motion correction

The user reported seeing motion during edits but not after a fresh dev-server
load, and clarified that the hero and marquee still moved. The correct project
and modified sources were confirmed on port 5173. The native Windows client-area
animation flag was enabled; that does not prove the browser's media preference.

A jsdom integration harness using actual React, GSAP and ScrollTrigger did not
reproduce a blanket loss of lower-page triggers. It now checks Strict Mode
mount/cleanup, delayed hero metadata/pin setup, delayed font readiness, rebuilt
section contexts, simulated forward/reverse native scroll and heading transforms,
controlled React updates, and full trigger cleanup on unmount. This is a DOM
simulation with synthetic geometry, not access to the user's browser.

Concrete timing weaknesses were corrected: GT3 spec labels and the initial
discovery transition had been able to complete while offscreen. They now scrub
against their own visible elements. Collection card motion is reversible rather
than one-shot, philosophy copy has its own trigger separate from its preceding
image, and masks/headings have longer, stronger reveal ranges. A shared layout
version rebuilds scoped section contexts after delayed hero pin/font setup.

The suite contains 24 checks. jsdom is a development-only testing dependency;
no new runtime package or section pin was introduced. The original reported
browser-specific failure has not been directly reproduced or visually verified.

## Fast-scroll hero renderer correction

The user approved fixing the fast-scroll freeze/jump behavior while retaining
scroll-position-driven playback, rather than forcing every source frame to play.
The renderer now queues compressed downloads with latest-target/directional
priority, uses bounded fetch pools (desktop 6 / mobile 4), warms several opening
frames before activation, and keeps a direction-biased decoded cache (desktop
32 / mobile 20). Speculative decoding leaves capacity for a new target and does
not occupy decoder slots waiting for network requests. Stale decoded results
outside the current cache window close instead of replacing the current image.

Missing exact frames use the nearest available bitmap immediately. Canvas draws
are capped at source resolution, and unchanged resize notifications no longer
clear the canvas. The underlying clip, frames, hero text playhead, pin distance,
reduced-motion/data-saving behavior, and MP4 fallback remain unchanged.

The suite now contains 28 checks. Added delayed-decode/network simulations prove
nearest-ready display, exact-frame catch-up, reserved target capacity, latest
request priority, stale result cleanup, mobile memory/concurrency bounds, reverse
look-ahead, and resize stability. These are not real-device timing benchmarks;
fast scrolling can still skip intermediate frames, and visual smoothness in the
user's browser has not been directly verified.

## Content and publication limits

The six models were chosen to match the available local photographs rather
than labeling unrelated stock images as the example models in the brief.
Prices and inventory are illustrative, not current market valuations or offers.
Only the featured GT3 performance figures are presented as verified numerical
manufacturer specifications. Other models show configuration summaries.
The Audi image shows the earlier B8 S5, so its illustrative record uses a 2010
4.2L V8 / six-speed Tiptronic configuration, not the later turbo-V6 generation.
This configuration is supported by Audi's 2010 A5/S5 manufacturer brochure:
https://www.auto-brochures.com/makes/Audi/A5/Audi_US%20A5_2010.pdf.

Image sourcing and GT3 attribution are in public/IMAGE-CREDITS.md.
Confirm rights to the user-supplied video and configure real inventory,
contact endpoints, contact details, and social accounts before commercial use.
