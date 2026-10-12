import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowUpRight } from "lucide-react";
import { AutomotiveImage } from "./AutomotiveImage";
import { ScrollNumber } from "./ScrollNumber";
import { useMotionLayoutVersion } from "../lib/motionLayout";
import {
  featuredVehicle,
  gt3SpecificationSource,
  type Vehicle,
} from "../lib/vehicles";

export function Featured({
  onExplore,
}: {
  onExplore: (vehicle: Vehicle) => void;
}) {
  const root = useRef<HTMLElement>(null);
  const motionLayoutVersion = useMotionLayoutVersion();
  useGSAP(
    () => {
      if (!motionLayoutVersion) return;
      const match = gsap.matchMedia();
      match.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".featured-title",
          { y: 64, opacity: 0.35 },
          {
            y: 0,
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: ".featured-title",
              start: "top 96%",
              end: "top 55%",
              scrub: 0.5,
            },
          },
        );
        gsap.fromTo(
          ".featured-window",
          { clipPath: "inset(18% 15% 18% 15%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            ease: "none",
            scrollTrigger: {
              trigger: ".featured-window",
              start: "top 96%",
              end: "top 35%",
              scrub: 0.6,
            },
          },
        );
        gsap.fromTo(
          ".featured-spec",
          { y: 40, opacity: 0.4 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.15,
            ease: "none",
            scrollTrigger: {
              trigger: ".featured-spec",
              start: "top 95%",
              end: "top 55%",
              scrub: 0.5,
            },
          },
        );
        gsap.fromTo(
          ".featured-image",
          { scale: 1.18 },
          {
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: ".featured-window",
              start: "top bottom",
              end: "bottom top",
              scrub: 0.5,
            },
          },
        );
      });
      return () => match.revert();
    },
    { scope: root, dependencies: [motionLayoutVersion], revertOnUpdate: true },
  );

  return (
    <section
      id="featured"
      ref={root}
      className="chapter bg-[#111111] px-5 py-32 md:px-10 md:py-48 lg:px-16"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="featured-title mb-14 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <h2 className="section-title max-w-5xl">
            The art of
            <br />
            performance.
          </h2>
          <p className="max-w-sm leading-relaxed text-white/60">
            Machines chosen for their character, engineering, and unmistakable
            presence.
          </p>
        </div>
        <button
          type="button"
          className="featured-window pointer-media relative block aspect-[4/3] w-full overflow-hidden md:aspect-[3/2]"
          aria-label="Explore the 2022 Porsche 911 GT3"
          onClick={() => onExplore(featuredVehicle)}
        >
          <AutomotiveImage
            src={featuredVehicle.image}
            alt="Black Porsche 911 GT3, 992 generation, with its swan-neck rear wing"
            className="featured-image size-full object-cover"
          />
          <span className="media-cursor" aria-hidden="true">
            Explore GT3 <ArrowUpRight size={15} />
          </span>
          <span className="absolute bottom-5 right-5 grid size-12 place-items-center bg-ink/80">
            <ArrowUpRight size={22} />
          </span>
        </button>
        <p className="mt-3 text-[10px] text-white/45">
          Photo:{" "}
          <a
            className="underline"
            href="https://commons.wikimedia.org/wiki/File:2021_Black_Porsche_911_GT3_992_HCC21.jpg"
            target="_blank"
            rel="noreferrer"
          >
            MrWalkr / Wikimedia Commons
          </a>{" "}
          ·{" "}
          <a
            className="underline"
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY-SA 4.0
          </a>{" "}
          · display cropped. Illustrative photograph, not an inventory record.
        </p>
        <div className="mt-10 grid gap-10 border-b border-white/15 pb-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">2022 / 992.1 / US-market PDK</p>
            <h3 className="mt-3 text-3xl tracking-[-.05em] md:text-5xl">
              Porsche 911 GT3.
            </h3>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/60">
              Born on the circuit. At home on the road. A 9,000 rpm flat-six and
              a chassis that makes every input matter.
            </p>
            <button
              type="button"
              className="button button-light mt-7"
              onClick={() => onExplore(featuredVehicle)}
            >
              Explore vehicle <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="self-center">
            <dl className="grid grid-cols-3 gap-4">
              {[
                ["502", "hp", "Power"],
                ["3.2", "s", "0–60 mph"],
                ["197", "mph", "Top track speed"],
              ].map(([value, unit, label]) => (
                <div
                  className="featured-spec border-t border-white/20 pt-5"
                  key={label}
                >
                  <dt className="eyebrow !tracking-[.08em]">{label}</dt>
                  <dd className="mt-4 text-3xl tracking-[-.06em] md:text-5xl">
                    <ScrollNumber value={value} />
                    <span className="ml-1 text-sm tracking-normal text-white/50">
                      {unit}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            <a
              href={gt3SpecificationSource}
              target="_blank"
              rel="noreferrer"
              className="mt-5 block text-xs text-white/45 underline underline-offset-4"
            >
              PDK variant specifications · Porsche Newsroom
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
