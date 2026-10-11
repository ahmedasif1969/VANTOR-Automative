import { AutomotiveImage } from "./AutomotiveImage";
import { MotionHeading } from "./MotionHeading";

const pillars = [
  [
    "Performance",
    "Engineering that delivers more than numbers.",
    "The response to an input. The balance through a corner. We value the moments that a specification sheet cannot describe.",
    "/images/performance.jpg",
    "McLaren 720S",
  ],
  [
    "Craftsmanship",
    "Exceptional detail, considered from every angle.",
    "Materials with purpose. Proportions with presence. Every surface and every small decision belongs to the whole.",
    "/images/gt3.jpg",
    "Black Porsche 911 GT3",
  ],
  [
    "Exclusivity",
    "A carefully curated collection for those who value distinction.",
    "Character over volume. Individuality over convention. A collection shaped around remarkable machines, not a crowded forecourt.",
    "/images/supercar.jpg",
    "Lamborghini Huracán",
  ],
];

export function Ownership() {
  return (
    <section
      id="story"
      className="bg-ink px-5 py-32 md:px-10 md:py-48 lg:px-16"
    >
      <div className="ownership-story mx-auto grid max-w-[1600px] gap-16 lg:grid-cols-[.8fr_1.2fr] lg:gap-24">
        <div className="ownership-heading h-fit">
          <p className="eyebrow" data-motion-copy>
            The VANTOR philosophy
          </p>
          <MotionHeading
            lines={["Beyond the", "ordinary."]}
            className="mt-6 text-[clamp(2.6rem,4.8vw,5.8rem)] font-medium uppercase leading-[.92] tracking-[-.06em]"
          />
          <p
            className="mt-7 max-w-sm leading-relaxed text-white/55"
            data-motion-copy
          >
            What we choose says everything. An independent perspective on the
            art of driving.
          </p>
        </div>
        <ol className="space-y-20 md:space-y-32">
          {pillars.map(([title, statement, copy, image, alt], index) => (
            <li
              key={title}
              className={
                "ownership-step flex flex-col gap-7 " +
                (index % 2 ? "pillar-offset" : "")
              }
            >
              <div className="pillar-media relative aspect-[4/3] overflow-hidden">
                <AutomotiveImage
                  src={image}
                  alt={alt}
                  className="step-image size-full object-cover"
                />
              </div>
              <div className="pillar-text">
                <div
                  className="step-rule h-px origin-left bg-signal"
                  data-motion-rule
                  aria-hidden="true"
                />
                <p className="mt-7 text-xs uppercase tracking-[.16em] text-white/55">
                  0{index + 1} — {title}
                </p>
                <h3 className="mt-4 max-w-xl text-3xl tracking-[-.04em] md:text-4xl">
                  {statement}
                </h3>
                <p className="mt-5 max-w-lg leading-relaxed text-white/55">
                  {copy}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
