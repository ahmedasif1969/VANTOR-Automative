import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

let activeLenis: Lenis | null = null;

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
        wheelMultiplier: 0.9,
        anchors: { offset: -90 },
        prevent: (node) =>
          node.matches("input, textarea, select, [data-lenis-prevent]"),
      });
      activeLenis = lenis;
      const update = (time: number) => {
        if (document.querySelector(".vehicle-dialog[open]")) lenis.stop();
        else if (lenis.isStopped) lenis.start();
        lenis.raf(time * 1000);
      };
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(update);
      gsap.ticker.lagSmoothing(0);
      let disposed = false;
      destroy = () => {
        if (disposed) return;
        disposed = true;
        gsap.ticker.remove(update);
        lenis.off("scroll", ScrollTrigger.update);
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
