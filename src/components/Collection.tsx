import { useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, SlidersHorizontal } from "lucide-react";
import { AutomotiveImage } from "./AutomotiveImage";
import { MotionHeading } from "./MotionHeading";
import { useMotionLayoutVersion } from "../lib/motionLayout";
import {
  filterVehicles,
  formatPrice,
  type Category,
  type SortOrder,
  type Vehicle,
} from "../lib/vehicles";

gsap.registerPlugin(Flip);

const categories: (Category | "All Vehicles")[] = [
  "All Vehicles",
  "Performance",
  "Luxury",
  "Supercars",
];

export function Collection({
  onExplore,
  onViewing,
}: {
  onExplore: (vehicle: Vehicle) => void;
  onViewing: (name: string) => void;
}) {
  const root = useRef<HTMLElement>(null);
  const motionLayoutVersion = useMotionLayoutVersion();
  const previousLayout = useRef<ReturnType<typeof Flip.getState> | null>(null);
  const [category, setCategory] = useState<Category | "All Vehicles">(
    "All Vehicles",
  );
  const [order, setOrder] = useState<SortOrder>("curated");
  const visible = useMemo(
    () => filterVehicles(category, order),
    [category, order],
  );
  const capture = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cards = root.current?.querySelectorAll(".vehicle-card");
    if (cards) previousLayout.current = Flip.getState(cards);
  };

  useGSAP(
    () => {
      const match = gsap.matchMedia();
      match.add("(prefers-reduced-motion: no-preference)", () => {
        const cards = gsap.utils.toArray<HTMLElement>(".vehicle-card");
        if (previousLayout.current)
          Flip.from(previousLayout.current, {
            duration: 0.55,
            ease: "power2.inOut",
            absolute: false,
            onEnter: (elements) =>
              gsap.fromTo(
                elements,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.4 },
              ),
            onComplete: () => ScrollTrigger.refresh(),
          });
        else
          cards.forEach((card) => {
            gsap.fromTo(
              card,
              { y: 64 },
              {
                y: 0,
                ease: "none",
                scrollTrigger: {
                  trigger: card,
                  start: "top 100%",
                  end: "top 55%",
                  scrub: 0.5,
                },
              },
            );
          });
        cards.forEach((card) => {
          gsap.fromTo(
            card.querySelector(".card-window"),
            { clipPath: "inset(18% 12% 18% 12%)" },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              ease: "none",
              scrollTrigger: {
                trigger: card,
                start: "top 98%",
                end: "top 40%",
                scrub: 0.4,
              },
            },
          );
          gsap.fromTo(
            card.querySelector(".card-media-scroll"),
            { scale: 1.16 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: card,
                start: "top bottom",
                end: "bottom 35%",
                scrub: 0.5,
              },
            },
          );
        });
      });
      previousLayout.current = null;
      const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
      return () => {
        cancelAnimationFrame(frame);
        match.revert();
      };
    },
    {
      scope: root,
      dependencies: [category, order, motionLayoutVersion],
      revertOnUpdate: true,
    },
  );

  return (
    <section
      id="collection"
      ref={root}
      className="bg-ink px-5 py-32 md:px-10 md:py-48 lg:px-16"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-12 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow mb-5" data-motion-copy>
              The illustrative collection
            </p>
            <MotionHeading lines={["Character.", "In every key."]} />
          </div>
          <p
            className="max-w-sm leading-relaxed text-white/60"
            data-motion-copy
          >
            Six distinct expressions of the drive. Choose what moves you, then
            take a closer look.
          </p>
        </div>
        <div className="mb-10 flex flex-col justify-between gap-5 border-y border-white/15 py-5 lg:flex-row lg:items-center">
          <div
            className="flex flex-wrap gap-1"
            role="group"
            aria-label="Filter vehicles by category"
          >
            {categories.map((name) => (
              <button
                type="button"
                key={name}
                aria-pressed={category === name}
                className={
                  "collection-filter " +
                  (category === name ? "is-selected" : "")
                }
                onClick={() => {
                  capture();
                  setCategory(name);
                }}
              >
                {name}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-3 text-xs text-white/60">
            <SlidersHorizontal size={15} /> Sort collection
            <select
              aria-label="Sort vehicles"
              className="collection-sort"
              value={order}
              onChange={(event) => {
                capture();
                setOrder(event.target.value as SortOrder);
              }}
            >
              <option value="curated">Curated order</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Name: A–Z</option>
            </select>
          </label>
        </div>
        <p
          role="status"
          aria-live="polite"
          className="mb-5 text-xs text-white/50"
        >
          {visible.length} vehicles · {category} · illustrative USD prices
        </p>
        <div className="vehicle-grid grid gap-x-6 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((vehicle) => (
            <article
              className="vehicle-card group min-w-0"
              data-flip-id={vehicle.id}
              key={vehicle.id}
            >
              <button
                type="button"
                className="card-window pointer-media relative block aspect-[4/3] w-full overflow-hidden bg-[#202020]"
                onClick={() => onExplore(vehicle)}
                aria-label={"View " + vehicle.name + " details"}
              >
                <div className="card-media-scroll size-full">
                  <AutomotiveImage
                    className="pointer-image size-full object-cover"
                    src={vehicle.image}
                    style={{ objectPosition: vehicle.imagePosition }}
                    alt={vehicle.name + " — illustrative model photograph"}
                  />
                </div>
                <span className="media-cursor" aria-hidden="true">
                  View vehicle <ArrowUpRight size={15} />
                </span>
                <span className="absolute bottom-4 right-4 grid size-10 place-items-center bg-ink/80">
                  <ArrowUpRight size={18} />
                </span>
              </button>
              <div className="border-b border-white/15 py-6">
                <p className="eyebrow">
                  {vehicle.year} / {vehicle.category}
                </p>
                <h3 className="mt-3 text-2xl font-medium tracking-[-.045em]">
                  {vehicle.name}
                </h3>
                <p className="mt-3 text-sm text-white/55">{vehicle.engine}</p>
                <p className="mt-1 text-xs text-white/45">
                  {vehicle.transmission} · {vehicle.drivetrain}
                </p>
                <p className="mt-5 text-xl tracking-[-.03em]">
                  {formatPrice(vehicle.price)}{" "}
                  <span className="text-xs tracking-normal text-white/45">
                    USD · example price
                  </span>
                </p>
              </div>
              <button
                type="button"
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs hover:text-signal"
                onClick={() => onViewing(vehicle.name)}
              >
                Enquire about this vehicle <ArrowUpRight size={14} />
              </button>
            </article>
          ))}
        </div>
        <p className="mt-8 max-w-3xl text-xs leading-relaxed text-white/45">
          Fictional concept inventory, not live availability or offers for sale.
          Years, variants, and USD asking prices are illustrative; photographs
          represent the models, not specific vehicles.
        </p>
      </div>
    </section>
  );
}
