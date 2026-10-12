import gsap from "gsap";

/** Delegated handlers also cover cards mounted by the collection filters. */
export function installPointerMotion(root: HTMLElement) {
  let magnetic: HTMLElement | null = null;
  let bounds: DOMRect | null = null;
  let media: HTMLElement | null = null;
  let mediaBounds: DOMRect | null = null;
  let frame = 0;
  let latestEvent: PointerEvent | null = null;
  const changed = new Set<HTMLElement>();

  const resetMagnet = () => {
    if (magnetic)
      gsap.to(magnetic, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: "elastic.out(1, 0.5)",
        overwrite: true,
      });
    magnetic = null;
    bounds = null;
  };
  const resetMedia = () => {
    if (media) {
      media.style.setProperty("--pointer-x", "0px");
      media.style.setProperty("--pointer-y", "0px");
    }
    media = null;
    mediaBounds = null;
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || !(event.target instanceof Element))
      return;
    const button = event.target.closest<HTMLElement>(".button");
    const next = event.target.closest<HTMLElement>(".pointer-media");
    // Read new geometry before writing any transforms or CSS properties.
    const buttonBounds = button !== magnetic ? button?.getBoundingClientRect() ?? null : bounds;
    const nextBounds = next !== media ? next?.getBoundingClientRect() ?? null : mediaBounds;
    if (button !== magnetic) {
      resetMagnet();
      magnetic = button;
      bounds = buttonBounds;
      if (button) changed.add(button);
    }
    if (magnetic && bounds) {
      gsap.to(magnetic, {
        x: (event.clientX - bounds.left - bounds.width / 2) * 0.12,
        y: (event.clientY - bounds.top - bounds.height / 2) * 0.16,
        duration: 0.3,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
    if (next !== media) {
      resetMedia();
      media = next;
      mediaBounds = nextBounds;
    }
    if (media && mediaBounds) {
      changed.add(media);
      const rect = mediaBounds;
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      media.style.setProperty("--pointer-x", `${(x - 0.5) * -16}px`);
      media.style.setProperty("--pointer-y", `${(y - 0.5) * -12}px`);
      media.style.setProperty("--cursor-x", `${x * 100}%`);
      media.style.setProperty("--cursor-y", `${y * 100}%`);
    }
  };
  const leave = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    latestEvent = null;
    resetMagnet();
    resetMedia();
  };
  const scheduleMove = (event: PointerEvent) => {
    latestEvent = event;
    if (!frame) frame = requestAnimationFrame(() => {
      frame = 0;
      if (latestEvent) move(latestEvent);
    });
  };
  root.addEventListener("pointermove", scheduleMove, { passive: true });
  root.addEventListener("pointerleave", leave);
  window.addEventListener("scroll", leave, { passive: true });
  window.addEventListener("resize", leave);
  return () => {
    cancelAnimationFrame(frame);
    root.removeEventListener("pointermove", scheduleMove);
    root.removeEventListener("pointerleave", leave);
    window.removeEventListener("scroll", leave);
    window.removeEventListener("resize", leave);
    for (const element of changed) {
      gsap.killTweensOf(element);
      if (element.matches(".button"))
        gsap.set(element, { clearProps: "transform" });
      for (const property of [
        "--pointer-x",
        "--pointer-y",
        "--cursor-x",
        "--cursor-y",
      ])
        element.style.removeProperty(property);
    }
  };
}
