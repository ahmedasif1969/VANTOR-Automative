import { useGSAP } from "@gsap/react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { HeroSequence } from "../lib/heroSequence";
import { notifyMotionLayoutChange } from "../lib/motionLayout";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const fallbackImage = "/videos/hero-frames/desktop/frame-001.webp";
const subscribePresentation = () => () => {};
const serverPresentation = () => false;
const getSimplePresentation = () => {
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !!connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || "");
};

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sequence = useRef<HeroSequence | null>(null);
  const [sequenceReady, setSequenceReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const simplePresentation = useSyncExternalStore(
    subscribePresentation, getSimplePresentation, serverPresentation,
  );

  useEffect(() => {
    if (simplePresentation) return;
    if (!canvas.current || typeof createImageBitmap !== "function") return;
    let renderer: HeroSequence;
    try {
      renderer = new HeroSequence(canvas.current, () => setSequenceReady(true));
    } catch {
      return;
    }
    sequence.current = renderer;
    void renderer.load().catch(() => {
      renderer.destroy();
      if (sequence.current === renderer) sequence.current = null;
    });
    return () => {
      renderer.destroy();
      if (sequence.current === renderer) sequence.current = null;
    };
  }, [simplePresentation]);

  useGSAP(
    () => {
      const element = video.current;
      if (simplePresentation) return;
      if (!sequenceReady && (!element || !duration || videoFailed)) return;

      const match = gsap.matchMedia();
      match.add("(prefers-reduced-motion: no-preference)", () => {
        element?.pause();
        const intro = root.current?.querySelector<HTMLElement>(".hero-intro");
        const playhead = { progress: 0 };
        let lastTarget = 0;
        const render = () => {
          if (intro) intro.inert = playhead.progress > 0.38;
          if (sequenceReady && sequence.current) {
            sequence.current.render(playhead.progress);
          } else if (element && !element.seeking) {
            const target = Math.min(
              duration - 0.01,
              Math.max(0, playhead.progress * duration),
            );
            if (Math.abs(element.currentTime - target) >= 1 / 24) {
              lastTarget = target;
              element.currentTime = target;
            }
          }
        };
        // Continue toward the newest smoothed target after a fallback video seek completes.
        const onSeeked = () => {
          if (Math.abs(element!.currentTime - lastTarget) < 0.05) render();
        };
        element?.addEventListener("seeked", onSeeked);

        const timeline = gsap.timeline({
          onUpdate: render,
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => (window.innerWidth < 768 ? "+=110%" : "+=160%"),
            scrub: 0.55,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        timeline
          .to(playhead, { progress: 1, duration: 1, ease: "none" }, 0)
          .to(
            ".hero-intro",
            {
              y: -44,
              opacity: 0,
              clipPath: "inset(0 0 100% 0)",
              duration: 0.26,
            },
            0.12,
          )
          .fromTo(
            ".hero-shift",
            { opacity: 0, y: 36 },
            { opacity: 1, y: 0, duration: 0.25 },
            0.38,
          )
          .to(".hero-shift", { opacity: 0, y: -28, duration: 0.18 }, 0.72)
          .fromTo(
            ".hero-final",
            { opacity: 0, y: 34 },
            { opacity: 1, y: 0, duration: 0.22 },
            0.77,
          )
          .to(".hero-vignette", { opacity: 0.95, duration: 0.6 }, 0.2);

        // The pin is installed after metadata/frame loading, not on the first render.
        // Recreate lower-page contexts only after its spacer has settled.
        const layoutFrame = requestAnimationFrame(() => {
          notifyMotionLayoutChange();
        });

        return () => {
          cancelAnimationFrame(layoutFrame);
          element?.removeEventListener("seeked", onSeeked);
          if (intro) intro.inert = false;
          sequence.current?.render(0);
        };
      });
      return () => match.revert();
    },
    {
      scope: root,
      dependencies: [duration, videoFailed, sequenceReady],
      revertOnUpdate: true,
    },
  );

  return (
    <section
      id="top"
      ref={root}
      className="hero relative h-svh min-h-[560px] overflow-hidden bg-ink md:min-h-[680px]"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${fallbackImage})` }}
        aria-hidden="true"
      />
      {!videoFailed && !simplePresentation && (
        <video
          ref={video}
          className={`hero-video absolute inset-0 size-full object-cover transition-opacity duration-700 ${videoReady && !sequenceReady ? "opacity-100" : "opacity-0"}`}
          src="/videos/vantor-hero.mp4?v=2"
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={(event) => {
            const length = event.currentTarget.duration;
            if (Number.isFinite(length) && length > 0) setDuration(length);
          }}
          onLoadedData={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
          aria-label="VANTOR performance vehicle in motion"
        />
      )}
      <canvas
        ref={canvas}
        className={`absolute inset-0 size-full transition-opacity duration-500 ${sequenceReady ? "opacity-100" : "opacity-0"}`}
        aria-hidden="true"
      />

      <div className="hero-vignette absolute inset-0" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,.36)_0%,rgba(8,8,8,.05)_34%,rgba(8,8,8,.17)_66%,rgba(8,8,8,.9)_100%)]" />

      <div className="relative z-10 mx-auto flex h-full max-w-[1600px] items-end px-5 pb-10 md:px-10 md:pb-14 lg:px-16">
        <div className="relative w-full">
          <div className="hero-intro">
            <p className="eyebrow mb-5">VANTOR AUTOMOTIVE / EST. 2026</p>
            <h1 className="max-w-6xl text-[clamp(2.7rem,9.2vw,9.5rem)] font-medium uppercase leading-[0.83] tracking-[-0.075em] text-white">
              Driven beyond
              <br />
              ordinary.
            </h1>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/70 md:text-base">
              A curated collection of exceptional machines, engineered to move
              you.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a className="button button-light" href="#collection">
                Explore collection <ArrowUpRight size={16} />
              </a>
              <a className="button button-dark" href="#story">
                Discover VANTOR
              </a>
            </div>
            <p className="mt-6 flex items-center gap-3 text-[10px] uppercase tracking-[.16em] text-white/50 md:hidden">
              Scroll to drive <ArrowDown size={14} />
            </p>
          </div>

          <div className="hero-shift pointer-events-none absolute bottom-0 left-0 max-w-2xl opacity-0">
            <p className="eyebrow mb-4">Machine. Material. Emotion.</p>
            <p className="text-balance text-[clamp(2.4rem,5vw,5.5rem)] font-medium leading-[0.95] tracking-[-0.055em] text-white">
              Every line chosen with intent.
            </p>
          </div>

          <div className="hero-final pointer-events-none absolute bottom-0 right-0 max-w-3xl text-right opacity-0">
            <p className="eyebrow mb-4">
              Porsche 911 GT3 / The featured machine
            </p>
            <p className="text-balance text-[clamp(2.4rem,5vw,5.5rem)] font-medium leading-[0.95] tracking-[-0.055em] text-white">
              The art of performance.
            </p>
          </div>

          <div className="absolute bottom-1 right-0 hidden items-center gap-3 text-xs uppercase tracking-[0.18em] text-white/60 md:flex">
            Scroll to drive <ArrowDown size={15} />
          </div>
        </div>
      </div>
    </section>
  );
}
