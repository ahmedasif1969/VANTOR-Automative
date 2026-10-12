import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { Collection } from "./components/Collection";
import { Experience } from "./components/Experience";
import { Featured } from "./components/Featured";
import { VehicleDialog } from "./components/VehicleDialog";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { Manifesto } from "./components/Manifesto";
import { Navigation } from "./components/Navigation";
import { Contact } from "./components/Contact";
import { Ownership } from "./components/Ownership";
import { ScrollStatement } from "./components/ScrollStatement";
import { installPointerMotion } from "./lib/pointerMotion";
import { installPageMotion } from "./lib/pageMotion";
import {
  notifyMotionLayoutChange,
  useMotionLayoutVersion,
} from "./lib/motionLayout";
import { scrollToSection, useSmoothScroll } from "./lib/useSmoothScroll";
import type { Vehicle } from "./lib/vehicles";

gsap.registerPlugin(ScrollTrigger, useGSAP);

function Marquee() {
  const names = ["Porsche", "Lamborghini", "McLaren", "Audi", "Ford"];
  return (
    <div
      className="marquee border-y border-white/10 bg-ink py-5"
      aria-label="Marques in the illustrative collection"
    >
      <div className="marquee-drift">
        <div className="marquee-track">
          {[...names, ...names].map((name, index) => (
            <span
              aria-hidden={index >= names.length || undefined}
              className="flex items-center gap-8 text-sm uppercase tracking-[0.23em] text-white/45"
              key={name + index}
            >
              {name}
              <i className="block size-1 rounded-full bg-signal" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const root = useRef<HTMLElement>(null);
  const motionLayoutVersion = useMotionLayoutVersion();
  const [interest, setInterest] = useState("");
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const openVehicle = (vehicle: Vehicle) => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setSelected(vehicle);
  };
  const requestViewing = (name: string) => {
    setInterest(name);
    scrollToSection("contact");
    document
      .getElementById("preferred-vehicle")
      ?.focus({ preventScroll: true });
  };
  useSmoothScroll();
  useEffect(() => {
    let disposed = false;
    document.fonts?.ready.then(() => {
      if (!disposed) notifyMotionLayoutChange();
    });
    return () => {
      disposed = true;
    };
  }, []);

  useGSAP(
    () => {
      if (!motionLayoutVersion) return;
      const match = gsap.matchMedia();
      match.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".manifesto-word",
          { opacity: 0.25, yPercent: 90, rotation: 2 },
          {
            opacity: 1,
            yPercent: 0,
            rotation: 0,
            stagger: 0.09,
            ease: "none",
            scrollTrigger: {
              trigger: ".manifesto-text",
              start: "top 82%",
              end: "bottom 45%",
              scrub: true,
            },
          },
        );
        gsap.to(".editorial", {
          backgroundColor: "#111111",
          ease: "none",
          scrollTrigger: {
            trigger: ".editorial",
            start: "top bottom",
            end: "center center",
            scrub: true,
          },
        });
        gsap.fromTo(
          ".editorial-image",
          { yPercent: -7, scale: 1.1 },
          {
            yPercent: 7,
            scale: 1.1,
            ease: "none",
            scrollTrigger: {
              trigger: ".editorial-media",
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
        gsap.from(".footer-content", {
          y: 32,
          opacity: 0,
          duration: 0.8,
          scrollTrigger: { trigger: "footer", start: "top 95%", once: true },
        });
      });
      match.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          desktop: "(min-width: 1024px)",
        },
        (context) => {
          if (context.conditions?.motion && root.current)
            return installPageMotion(
              root.current,
              Boolean(context.conditions.desktop),
            );
        },
      );
      match.add(
        "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => (root.current ? installPointerMotion(root.current) : undefined),
      );
      return () => {
        match.revert();
      };
    },
    { scope: root, dependencies: [motionLayoutVersion], revertOnUpdate: true },
  );

  return (
    <main
      ref={root}
      className="w-full max-w-full overflow-x-hidden bg-ink text-white"
    >
      <Navigation />
      <div className="page-scroll-progress" aria-hidden="true" />
      <Hero />
      <Featured onExplore={openVehicle} />
      <ScrollStatement />
      <Marquee />
      <Collection onExplore={openVehicle} onViewing={requestViewing} />
      <Manifesto />
      <Ownership />
      <Experience onExplore={openVehicle} />
      <Contact interest={interest} onInterestChange={setInterest} />
      <Footer />
      <VehicleDialog
        vehicle={selected}
        onClose={() => setSelected(null)}
        onViewing={requestViewing}
        opener={opener}
      />
    </main>
  );
}
