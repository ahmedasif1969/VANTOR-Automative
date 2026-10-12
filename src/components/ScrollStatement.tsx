import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useMotionLayoutVersion } from "../lib/motionLayout";

const statement =
  "A remarkable car does more than move you. It changes the rhythm of a road, the feeling of a journey, and the way you arrive.";

export function ScrollStatement() {
  const root = useRef<HTMLElement>(null);
  const motionLayoutVersion = useMotionLayoutVersion();

  useGSAP(
    () => {
      if (!motionLayoutVersion) return;
      const match = gsap.matchMedia();
      match.add("(prefers-reduced-motion: no-preference)", () => {
        const words = gsap.utils.toArray<HTMLElement>(".scroll-highlight-word");
        const paragraph = root.current?.querySelector(".scroll-highlight-text");
        if (!paragraph || !words.length) return;

        // One reversible playhead highlights the sentence in reading order.
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: paragraph,
            start: "top 78%",
            end: "bottom 42%",
            scrub: 0.35,
            invalidateOnRefresh: true,
          },
        });
        timeline.fromTo(
          words,
          { opacity: 0.4 },
          { opacity: 1, duration: 0.65, stagger: 0.14, ease: "none" },
          0,
        );
        timeline.fromTo(
          ".statement-rule",
          { scaleX: 0 },
          { scaleX: 1, duration: timeline.duration(), ease: "none" },
          0,
        );
      });
      return () => match.revert();
    },
    { scope: root, dependencies: [motionLayoutVersion], revertOnUpdate: true },
  );

  return (
    <section
      id="statement"
      ref={root}
      aria-labelledby="statement-heading"
      className="bg-ink px-5 py-32 md:px-10 md:py-40 lg:px-16"
    >
      <div className="mx-auto max-w-[1600px]">
        <h2 id="statement-heading" className="eyebrow mb-10">
          A feeling, not a specification.
        </h2>
        <p className="scroll-highlight-text max-w-6xl text-[clamp(1.8rem,4.25vw,4.75rem)] font-medium leading-[1.13] tracking-[-.045em]">
          <span className="sr-only">{statement}</span>
          <span aria-hidden="true">
            {statement.split(" ").map((word, index) => (
              <span key={index}>
                <span className="scroll-highlight-word inline-block">
                  {word}
                </span>{" "}
              </span>
            ))}
          </span>
        </p>
        <div className="mt-12 h-px w-32 bg-white/15" aria-hidden="true">
          <div className="statement-rule h-full origin-left bg-signal" />
        </div>
      </div>
    </section>
  );
}
