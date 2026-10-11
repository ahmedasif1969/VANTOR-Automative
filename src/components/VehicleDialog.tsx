import { useEffect, useRef, type RefObject } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowUpRight, X } from "lucide-react";
import { AutomotiveImage } from "./AutomotiveImage";
import {
  formatPrice,
  gt3SpecificationSource,
  type Vehicle,
} from "../lib/vehicles";

export function VehicleDialog({
  vehicle,
  onClose,
  onViewing,
  opener,
}: {
  vehicle: Vehicle | null;
  onClose: () => void;
  onViewing: (name: string) => void;
  opener: RefObject<HTMLElement | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closing = useRef(false);
  const { contextSafe } = useGSAP(
    () => {
      closing.current = false;
      if (!vehicle) {
        dialog.current?.close();
        return;
      }
      dialog.current?.showModal();
      const match = gsap.matchMedia();
      match.add("(prefers-reduced-motion: no-preference)", () =>
        gsap.fromTo(
          ".detail-panel",
          { opacity: 0, y: 45 },
          { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" },
        ),
      );
      return () => match.revert();
    },
    { scope: dialog, dependencies: [vehicle?.id], revertOnUpdate: true },
  );

  useEffect(() => {
    const element = dialog.current;
    return () => element?.close();
  }, []);

  const close = contextSafe((inquiry = false) => {
    if (closing.current) return;
    closing.current = true;
    const finish = () => {
      dialog.current?.close();
      onClose();
      opener.current?.focus({ preventScroll: true });
      if (inquiry && vehicle) onViewing(vehicle.name);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) finish();
    else
      gsap.to(dialog.current?.querySelector(".detail-panel") || [], {
        opacity: 0,
        y: 30,
        duration: 0.22,
        overwrite: true,
        onComplete: finish,
      });
  });

  return (
    <dialog
      ref={dialog}
      className="vehicle-dialog"
      aria-labelledby="vehicle-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      data-lenis-prevent
    >
      {vehicle && (
        <div className="detail-panel relative bg-[#111111]">
          <button
            type="button"
            onClick={() => close()}
            autoFocus
            className="absolute right-4 top-4 z-10 grid size-11 place-items-center bg-ink/90"
            aria-label="Close vehicle details"
          >
            <X size={20} />
          </button>
          <AutomotiveImage
            src={vehicle.image}
            style={{ objectPosition: vehicle.imagePosition }}
            alt={vehicle.name}
            className="aspect-[3/2] w-full object-cover"
          />
          <div className="p-6 md:p-10">
            <p className="eyebrow">
              {vehicle.year} / {vehicle.category} / Concept inventory
            </p>
            <h2
              id="vehicle-dialog-title"
              className="mt-4 text-3xl font-medium tracking-[-.04em] md:text-5xl"
            >
              {vehicle.name}
            </h2>
            <p className="mt-5 max-w-2xl leading-relaxed text-white/65">
              {vehicle.description}
            </p>
            <dl className="my-8 grid gap-6 border-y border-white/15 py-6 text-sm sm:grid-cols-2">
              {[
                ["Engine", vehicle.engine],
                ["Transmission", vehicle.transmission],
                ["Drivetrain", vehicle.drivetrain],
                [
                  "Illustrative asking price",
                  formatPrice(vehicle.price) + " USD",
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-white/45">{label}</dt>
                  <dd className="mt-2">{value}</dd>
                </div>
              ))}
            </dl>
            {vehicle.id === "gt3" && (
              <div className="mb-8">
                <p className="text-sm text-white/70">
                  US-market PDK: 502 hp · 0–60 mph in 3.2 s · 197 mph top track
                  speed.
                </p>
                <a
                  href={gt3SpecificationSource}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block text-xs text-white/50 underline"
                >
                  Verified variant specifications · Porsche Newsroom
                </a>
                <p className="mt-3 text-[10px] text-white/45">
                  Photograph:{" "}
                  <a
                    href="https://commons.wikimedia.org/wiki/File:2021_Black_Porsche_911_GT3_992_HCC21.jpg"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    MrWalkr / Wikimedia Commons
                  </a>
                  ,{" "}
                  <a
                    href="https://creativecommons.org/licenses/by-sa/4.0/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    CC BY-SA 4.0
                  </a>
                  ; cropped for display.
                </p>
              </div>
            )}
            <button
              type="button"
              className="button button-light"
              onClick={() => close(true)}
            >
              Enquire about this vehicle <ArrowUpRight size={16} />
            </button>
            <p className="mt-4 text-xs leading-relaxed text-white/45">
              Fictional concept inventory. No live availability, booking, or
              offer for sale. Photos illustrate the models; years, variants, and
              prices are example data.
            </p>
          </div>
        </div>
      )}
    </dialog>
  );
}
