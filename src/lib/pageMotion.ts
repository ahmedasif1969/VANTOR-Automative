import gsap from "gsap";

/** Called inside the App's reduced-motion matchMedia context; no pins or RAFs. */
export function installPageMotion(root: HTMLElement, desktop: boolean) {
  const restoreNumbers: (() => void)[] = [];
  root
    .querySelectorAll<HTMLElement>("[data-motion-number]")
    .forEach((number) => {
      const value = number.dataset.motionNumber ?? "0";
      const decimals = value.includes(".") ? value.split(".")[1].length : 0;
      const counter = { value: 0 };
      restoreNumbers.push(() => {
        number.textContent = value;
      });
      // Visual digits scrub; assistive technology always receives the actual figure.
      gsap.to(counter, {
        value: Number(value),
        ease: "none",
        onUpdate: () => {
          number.textContent = counter.value.toFixed(decimals);
        },
        scrollTrigger: {
          trigger: number.closest(".featured-spec"),
          start: "top 95%",
          end: "top 68%",
          scrub: 0.4,
          onRefresh: () => {
            number.textContent = counter.value.toFixed(decimals);
          },
        },
      });
    });
  root
    .querySelectorAll<HTMLElement>("[data-motion-heading]")
    .forEach((heading) => {
      gsap.fromTo(
        heading.querySelectorAll(".motion-heading-line"),
        { yPercent: 105, rotation: 1.5 },
        {
          yPercent: 0,
          rotation: 0,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: heading,
            start: "top 94%",
            end: "top 42%",
            scrub: 0.45,
            invalidateOnRefresh: true,
          },
        },
      );
    });

  root.querySelectorAll<HTMLElement>("[data-motion-copy]").forEach((copy) => {
    gsap.fromTo(
      copy,
      { y: desktop ? 28 : 16, opacity: 0.45 },
      {
        y: 0,
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: copy,
          start: "top 96%",
          end: "top 65%",
          scrub: 0.35,
        },
      },
    );
  });

  root.querySelectorAll<HTMLElement>("[data-motion-rule]").forEach((rule) => {
    gsap.fromTo(
      rule,
      { scaleX: 0 },
      {
        scaleX: 1,
        transformOrigin: "left center",
        ease: "none",
        scrollTrigger: {
          trigger: rule,
          start: "top 90%",
          end: "top 55%",
          scrub: 0.4,
        },
      },
    );
  });

  root
    .querySelectorAll<HTMLElement>(".ownership-step")
    .forEach((step, index) => {
      const media = step.querySelector(".pillar-media");
      const image = step.querySelector(".step-image");
      const text = step.querySelector(".pillar-text");
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: media,
          start: "top 94%",
          end: "top 35%",
          scrub: 0.5,
          invalidateOnRefresh: true,
        },
      });
      timeline.fromTo(
        media,
        {
          clipPath: "inset(18% 16% 18% 16%)",
          x: desktop ? (index % 2 ? 40 : -40) : 0,
        },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          x: 0,
          ease: "power2.out",
          duration: 1,
        },
        0,
      );
      gsap.fromTo(
        text,
        { y: desktop ? 50 : 24, opacity: 0.4 },
        {
          y: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: text,
            start: "top 95%",
            end: "top 55%",
            scrub: 0.5,
          },
        },
      );
      gsap.fromTo(
        image,
        { scale: desktop ? 1.16 : 1.07, yPercent: desktop ? -4 : 0 },
        {
          scale: desktop ? 1.08 : 1,
          yPercent: desktop ? 4 : 0,
          ease: "none",
          scrollTrigger: {
            trigger: media,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.5,
          },
        },
      );
    });

  const discovery = root.querySelector("#drive-recommendation");
  if (discovery) {
    gsap.fromTo(
      discovery,
      { clipPath: "inset(12% 10% 12% 10%)" },
      {
        clipPath: "inset(0% 0% 0% 0%)",
        ease: "none",
        scrollTrigger: {
          trigger: discovery,
          start: "top 95%",
          end: "top 35%",
          scrub: 0.5,
        },
      },
    );
  }
  const choices = root.querySelectorAll(".discovery-choice");
  if (choices.length)
    gsap.fromTo(
      choices,
      { y: 24 },
      {
        y: 0,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".discovery-choices",
          start: "top 96%",
          end: "top 70%",
          scrub: 0.4,
        },
      },
    );

  gsap.fromTo(
    root.querySelector(".page-scroll-progress"),
    { scaleX: 0 },
    {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        start: 0,
        end: "max",
        scrub: 0.15,
        invalidateOnRefresh: true,
      },
    },
  );
  gsap.fromTo(
    root.querySelector(".marquee-drift"),
    { x: desktop ? 80 : 25 },
    {
      x: desktop ? -80 : -25,
      ease: "none",
      scrollTrigger: {
        trigger: ".marquee",
        start: "top bottom",
        end: "bottom top",
        scrub: 0.6,
      },
    },
  );
  // GSAP reverts styles, not textContent: restore figures on media changes/unmount.
  return () => restoreNumbers.forEach((restore) => restore());
}
