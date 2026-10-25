import { useGSAP } from "@gsap/react";
import { ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  HeroSequence,
  HERO_STARTUP_DECODE_FRAMES,
  HERO_STARTUP_DOWNLOAD_FRAMES,
  type HeroStartupProgress,
} from "../lib/heroSequence";
import { notifyMotionLayoutChange } from "../lib/motionLayout";
import { holdHeroScrollAt, releaseHeroScrollHold, setIntroLoading } from "../lib/useSmoothScroll";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const fallbackImage = "/videos/hero-frames/desktop/frame-001.webp?v=3";
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
  const poster = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const skipButton = useRef<HTMLButtonElement>(null);
  const sequence = useRef<HeroSequence | null>(null);
  const textTimeline = useRef<gsap.core.Timeline | null>(null);
  const [sequenceReady, setSequenceReady] = useState(false);
  const [startupBufferProgress, setStartupBufferProgress] = useState<HeroStartupProgress>({ downloaded: 0, decoded: 0 });
  const [startupDismissed, setStartupDismissed] = useState(false);
  const [posterReady, setPosterReady] = useState(false);
  const [variant, setVariant] = useState<"desktop" | "mobile">("desktop");
  const simplePresentation = useSyncExternalStore(
    subscribePresentation, getSimplePresentation, serverPresentation,
  );
  const showStartupScreen = !simplePresentation && !startupDismissed;
  const startupPercent = Math.round(Math.min(
    startupBufferProgress.downloaded / HERO_STARTUP_DOWNLOAD_FRAMES,
    startupBufferProgress.decoded / HERO_STARTUP_DECODE_FRAMES,
  ) * 100);
  const showFrame = useCallback((progress: number) => {
    textTimeline.current?.progress(progress);
    const intro = root.current?.querySelector<HTMLElement>(".hero-intro");
    if (intro) intro.inert = progress > 0.38;
    if (progress >= 1) releaseHeroScrollHold();
  }, []);

  useEffect(() => {
    if (!showStartupScreen) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    setIntroLoading(true);
    skipButton.current?.focus();
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      setIntroLoading(false);
    };
  }, [showStartupScreen]);

  useEffect(() => {
    if (poster.current?.complete && poster.current.naturalWidth) setPosterReady(true);
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setVariant(media.matches ? "mobile" : "desktop");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (simplePresentation) return;
    if (!posterReady) return;
    if (!canvas.current || typeof createImageBitmap !== "function") {
      setStartupDismissed(true);
      return;
    }
    if (variant !== (window.innerWidth < 768 ? "mobile" : "desktop")) return;
    setSequenceReady(false);
    let disposed = false;
    let renderer: HeroSequence;
    try {
      renderer = new HeroSequence(canvas.current, () => {
        if (disposed) return;
        setSequenceReady(true);
      }, showFrame, variant, () => {
        if (!disposed) {
          setSequenceReady(false);
          sequence.current = null;
          setStartupDismissed(true);
          releaseHeroScrollHold();
        }
      }, progress => {
        if (!disposed) setStartupBufferProgress(progress);
      }, () => {
        if (!disposed) {
          setStartupBufferProgress({
            downloaded: HERO_STARTUP_DOWNLOAD_FRAMES,
            decoded: HERO_STARTUP_DECODE_FRAMES,
          });
          setStartupDismissed(true);
        }
      });
    } catch {
      setStartupDismissed(true);
      return;
    }
    sequence.current = renderer;
    void renderer.load().catch(() => {
      if (disposed) return;
      renderer.destroy();
      if (sequence.current === renderer) sequence.current = null;
      setSequenceReady(false);
      setStartupDismissed(true);
      releaseHeroScrollHold();
    });
    return () => {
      disposed = true;
      renderer.destroy();
      if (sequence.current === renderer) sequence.current = null;
      releaseHeroScrollHold();
    };
  }, [simplePresentation, posterReady, variant, showFrame]);

  useGSAP(
    () => {
      if (simplePresentation) return;

      const match = gsap.matchMedia();
      match.add("(prefers-reduced-motion: no-preference)", () => {
        const intro = root.current?.querySelector<HTMLElement>(".hero-intro");
        const timeline = gsap.timeline({ paused: true });
        textTimeline.current = timeline;

        timeline
          .to({}, { duration: 1 }, 0)
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
        timeline.progress(0);

        const trigger = ScrollTrigger.create({
          trigger: root.current,
          start: "top top",
          end: () => {
            const track = root.current!;
            const scene = track.querySelector<HTMLElement>(".hero")!;
            return "+=" + Math.max(1, track.offsetHeight - scene.offsetHeight);
          },
          onUpdate: (self) => {
            const activeSequence = sequence.current;
            activeSequence?.render(self.progress);
            // At the end of the scroll track, keep the sticky hero in place
            // until its sequential renderer has painted the final frame.
            if (self.progress >= 1 && activeSequence && !activeSequence.isComplete) {
              holdHeroScrollAt(self.end - 1);
            }
          },
          refreshPriority: 1,
          invalidateOnRefresh: true,
        });
        sequence.current?.render(trigger.progress);

        // The CSS sticky track reserves scroll distance before JavaScript loads.
        const layoutFrame = requestAnimationFrame(() => {
          notifyMotionLayoutChange();
        });

        return () => {
          cancelAnimationFrame(layoutFrame);
          trigger.kill();
          releaseHeroScrollHold();
          if (textTimeline.current === timeline) textTimeline.current = null;
          if (intro) intro.inert = false;
        };
      });
      return () => match.revert();
    },
    {
      scope: root,
      dependencies: [simplePresentation],
      revertOnUpdate: true,
    },
  );

  return (
    <section
      id="top"
      ref={root}
      className={`hero-track relative ${simplePresentation ? "hero-track-simple" : ""}`}
    >
      <div className="hero sticky top-0 h-svh min-h-[560px] overflow-hidden bg-ink md:min-h-[680px]">
      <picture aria-hidden="true">
        <source media="(max-width: 767px)" srcSet="/videos/hero-frames/mobile/frame-001.webp?v=4" />
        <img
          ref={poster}
          className="absolute inset-0 size-full object-cover object-[60%_52%] md:object-[50%_52%]"
          src={fallbackImage}
          alt=""
          decoding="async"
          onLoad={() => setPosterReady(true)}
          width={1600}
          height={900}
        />
      </picture>
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

        </div>
      </div>
      </div>
      {showStartupScreen && (
        <div
          className="fixed inset-0 z-[100] flex min-h-svh flex-col justify-between bg-ink px-6 py-8 text-white sm:px-10 sm:py-10"
          role="dialog"
          aria-modal="true"
          data-lenis-prevent=""
          aria-labelledby="hero-loading-title"
          aria-describedby="hero-loading-description"
          onKeyDown={event => {
            if (event.key === "Escape") setStartupDismissed(true);
            if (event.key === "Tab") {
              event.preventDefault();
              skipButton.current?.focus();
            }
          }}
        >
          <p className="eyebrow">VANTOR AUTOMOTIVE / EST. 2026</p>
          <div className="mx-auto w-full max-w-xl">
            <p className="eyebrow mb-5 text-white/50">The drive begins here</p>
            <h2 id="hero-loading-title" className="text-[clamp(2.5rem,8vw,5.5rem)] font-medium uppercase leading-[0.88] tracking-[-0.07em]">
              Preparing your experience.
            </h2>
            <p id="hero-loading-description" className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">
              Your drive begins shortly.
            </p>
            <div
              className="mt-10 h-px w-full overflow-hidden bg-white/20"
              role="progressbar"
              aria-label="Experience loading progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={startupPercent}
            >
              <div
                className="h-full bg-white transition-[width] duration-200"
                style={{ width: `${startupPercent}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[.16em] text-white/50">
              <span>Loading</span>
              <span>{startupPercent}%</span>
            </div>
          </div>
          <button
            ref={skipButton}
            type="button"
            className="self-end text-xs uppercase tracking-[.18em] text-white/70 transition-colors hover:text-white focus-visible:text-white"
            onClick={() => setStartupDismissed(true)}
          >
            Skip intro <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </section>
  );
}
