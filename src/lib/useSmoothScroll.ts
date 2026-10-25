import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

let activeLenis: Lenis | null = null;
let heroScrollHold = false;
let introLoading = false;
let heroScrollLimit: (() => number | null) | null = null;

export function setHeroScrollLimit(limit: (() => number | null) | null) {
  heroScrollLimit = limit;
}

export function setIntroLoading(loading: boolean) {
  introLoading = loading;
  if (loading) activeLenis?.stop();
  else if (!heroScrollHold && !document.querySelector(".vehicle-dialog[open]")) activeLenis?.start();
}

export function holdHeroScrollAt(position: number) {
  heroScrollHold = true;
  if (activeLenis) {
    // Reset Lenis's destination as well as the native scroll position so a
    // large wheel gesture cannot resume past the hero after playback catches up.
    activeLenis.scrollTo(position, { immediate: true, force: true });
    activeLenis.stop();
  } else {
    window.scrollTo(0, position);
  }
}

export function releaseHeroScrollHold() {
  if (!heroScrollHold) return;
  heroScrollHold = false;
  if (!introLoading && !document.querySelector(".vehicle-dialog[open]")) activeLenis?.start();
}

export function scrollToSection(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  if (activeLenis) {
    activeLenis.start();
    activeLenis.scrollTo(target, { offset: -90 });
  } else
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  history.replaceState(null, "", `#${id}`);
}

export function useSmoothScroll() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let destroy = () => {};
    const install = () => {
      destroy();
      if (media.matches) return;
      const lenis = new Lenis({
        duration: 1.05,
        smoothWheel: true,
        syncTouch: true,
        wheelMultiplier: 0.9,
        anchors: { offset: -90 },
        prevent: (node) =>
          node.matches("input, textarea, select, [data-lenis-prevent]"),
      });
      activeLenis = lenis;
      if (introLoading) lenis.stop();
      const capHeroScroll = ({ deltaY, event }: { deltaY: number; event: WheelEvent | TouchEvent }) => {
        const limit = heroScrollLimit?.();
        if (limit == null || deltaY <= 0 || lenis.scroll >= limit) return;
        const isTouch = event.type.startsWith("touch");
        const projectedDelta = event.type === "touchend"
          ? Math.sign(deltaY) * Math.abs(lenis.velocity) ** 1.7
          : deltaY;
        if (lenis.targetScroll + projectedDelta <= limit) return;

        // Stop the gesture before it can move past the sticky hero. Further
        // input at the boundary cannot restart the same scroll animation.
        if (event.cancelable) event.preventDefault();
        (event as (WheelEvent | TouchEvent) & { lenisStopPropagation?: boolean }).lenisStopPropagation = true;
        if (lenis.targetScroll === limit) return;
        lenis.scrollTo(limit, {
          programmatic: false,
          ...(isTouch ? { lerp: 1 } : { duration: 1.05 }),
          onComplete: () => {
            if (heroScrollLimit?.() != null) holdHeroScrollAt(limit);
          },
        });
      };
      const update = (time: number) => {
        if (introLoading || document.querySelector(".vehicle-dialog[open]")) lenis.stop();
        else if (!heroScrollHold && lenis.isStopped) lenis.start();
        lenis.raf(time * 1000);
      };
      lenis.on("scroll", ScrollTrigger.update);
      lenis.on("virtual-scroll", capHeroScroll);
      gsap.ticker.add(update);
      gsap.ticker.lagSmoothing(0);
      let disposed = false;
      destroy = () => {
        if (disposed) return;
        disposed = true;
        gsap.ticker.remove(update);
        lenis.off("scroll", ScrollTrigger.update);
        lenis.off("virtual-scroll", capHeroScroll);
        lenis.destroy();
        if (activeLenis === lenis) activeLenis = null;
      };
    };
    install();
    media.addEventListener("change", install);
    return () => {
      media.removeEventListener("change", install);
      destroy();
    };
  }, []);
}
