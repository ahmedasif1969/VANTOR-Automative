import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, Gauge } from "lucide-react";
import { AutomotiveImage } from "./AutomotiveImage";
import { MotionHeading } from "./MotionHeading";
import { notifyMotionLayoutChange, useMotionLayoutVersion } from "../lib/motionLayout";
import {
  formatPrice,
  recommendVehicle,
  type Preference,
  type Vehicle,
} from "../lib/vehicles";

const preferences: Preference[] = [
  "Performance",
  "Luxury",
  "Everyday refinement",
];
const descriptions = {
  Performance:
    "For the road that takes the long way home. Precision, feedback, and a machine that rewards your attention.",
  Luxury:
    "For arriving unhurried. Quiet confidence, long-distance composure, and a cabin that makes room for you.",
  "Everyday refinement":
    "For making the everyday feel considered. Effortless versatility, expressive design, and comfort without compromise.",
};

export function Experience({
  onExplore,
}: {
  onExplore: (vehicle: Vehicle) => void;
}) {
  const root = useRef<HTMLElement>(null);
  const motionLayoutVersion = useMotionLayoutVersion();
  const previousPreference = useRef<Preference | null>(null);
  const [preference, setPreference] = useState<Preference>("Performance");
  const selected = recommendVehicle(preference);
  useGSAP(
    () => {
      if (!motionLayoutVersion) return;
      const selectionChanged =
        previousPreference.current !== null &&
        previousPreference.current !== preference;
      previousPreference.current = preference;
      const match = gsap.matchMedia();
      match.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline(
            selectionChanged
              ? {}
              : {
                  scrollTrigger: {
                    trigger: "#drive-recommendation",
                    start: "top 96%",
                    end: "top 35%",
                    scrub: 0.6,
                  },
                },
          )
          .fromTo(
            ".discovery-image",
            {
              clipPath: "inset(0% 0% 0% 100%)",
              scale: 1.08,
            },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              scale: 1,
              duration: 0.8,
              ease: "power3.inOut",
            },
          )
          .from(
            ".discovery-copy > *",
            {
              y: 18,
              opacity: 0,
              duration: 0.5,
              stagger: 0.055,
              ease: "power2.out",
            },
            0.18,
          );
      });
      const frame = requestAnimationFrame(notifyMotionLayoutChange);
      return () => {
        cancelAnimationFrame(frame);
        match.revert();
      };
    },
    {
      scope: root,
      dependencies: [preference, motionLayoutVersion],
      revertOnUpdate: true,
    },
  );

  return (
    <section
      id="experience"
      ref={root}
      className="chapter bg-[#111111] px-5 py-32 md:px-10 md:py-48 lg:px-16"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-14 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <MotionHeading lines={["Find your", "drive."]} />
          <p
            className="max-w-sm leading-relaxed text-white/60"
            data-motion-copy
          >
            There is no single definition of exceptional. Choose a feeling.
            We’ll bring you closer to the machine.
          </p>
        </div>
        <div
          className="discovery-choices mb-8"
          role="group"
          aria-label="Choose your driving preference"
        >
          {preferences.map((name, index) => (
            <button
              type="button"
              key={name}
              className={
                "discovery-choice " + (preference === name ? "is-active" : "")
              }
              aria-pressed={preference === name}
              aria-controls="drive-recommendation"
              onClick={() => setPreference(name)}
            >
              <span className="text-xs text-white/40">0{index + 1}</span>
              <span>{name}</span>
              <ArrowUpRight
                size={18}
                className={
                  preference === name ? "text-signal" : "text-white/30"
                }
              />
            </button>
          ))}
        </div>
        <div
          id="drive-recommendation"
          className="bento-grid grid md:grid-cols-12 md:grid-rows-2"
        >
          <button
            type="button"
            className="pointer-media relative min-h-[320px] overflow-hidden bg-[#151515] md:col-span-7 md:row-span-2 md:min-h-[600px]"
            onClick={() => onExplore(selected)}
            aria-label={"Explore recommended " + selected.name}
          >
            <AutomotiveImage
              src={selected.image}
              style={{ objectPosition: selected.imagePosition }}
              alt={selected.name}
              className="discovery-image absolute inset-0 size-full object-cover"
            />
            <span className="media-cursor" aria-hidden="true">
              Explore recommendation <ArrowUpRight size={15} />
            </span>
          </button>
          <div className="discovery-copy bg-[#151515] p-7 md:col-span-5 md:p-10">
            <p className="eyebrow">Your drive / {preference}</p>
            <h3 className="mt-5 text-3xl tracking-[-.04em] md:text-4xl">
              {selected.name}
            </h3>
            <p className="mt-5 leading-relaxed text-white/60">
              {descriptions[preference]}
            </p>
            <button
              type="button"
              className="button button-light mt-7"
              onClick={() => onExplore(selected)}
            >
              Explore this match <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="discovery-copy flex flex-col justify-center bg-[#1a1a1a] p-7 md:col-span-5 md:p-10">
            <Gauge size={24} strokeWidth={1.3} className="mb-6 text-signal" />
            <p className="text-lg">{selected.engine}</p>
            <p className="mt-2 text-sm text-white/50">
              {selected.transmission} / {selected.drivetrain}
            </p>
            <p className="mt-6 text-sm text-white/60">
              {selected.year} · {formatPrice(selected.price)} USD · illustrative
              price
            </p>
          </div>
        </div>
        <p
          role="status"
          aria-live="polite"
          className="mt-5 text-xs text-white/50"
        >
          {preference}: recommended {selected.name}. Concept recommendation, not
          a live offer.
        </p>
      </div>
    </section>
  );
}
