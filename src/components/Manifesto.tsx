import { AutomotiveImage } from "./AutomotiveImage";

export function Manifesto() {
  return (
    <section className="editorial relative overflow-hidden bg-ink px-5 py-32 md:px-10 md:py-48 lg:px-16">
      <div className="relative mx-auto max-w-[1600px]">
        <p className="eyebrow mb-10" data-motion-copy>
          The feeling stays with you
        </p>
        <h2 className="manifesto-text text-[clamp(2.9rem,8.2vw,9rem)] font-medium uppercase leading-[.9] tracking-[-.065em]">
          <span className="block overflow-hidden">
            {["Not", "just", "a", "car."].map((word) => (
              <span
                key={word}
                className="manifesto-word mr-[.2em] inline-block"
              >
                {word}
              </span>
            ))}
          </span>
          <span className="mt-3 block overflow-hidden">
            {["An", "experience."].map((word) => (
              <span
                key={word}
                className="manifesto-word mr-[.2em] inline-block"
              >
                {word}
              </span>
            ))}
          </span>
        </h2>
        <div className="mt-16 grid items-end gap-10 md:grid-cols-[.7fr_1.3fr]">
          <p
            className="max-w-md text-lg leading-relaxed text-white/60"
            data-motion-copy
          >
            The rhythm of a road. The anticipation before the ignition. A
            remarkable machine changes how an ordinary journey is remembered.
          </p>
          <div className="editorial-media aspect-[16/10] overflow-hidden">
            <AutomotiveImage
              src="/images/porsche.jpg"
              alt="Porsche Panamera on a winding road"
              className="editorial-image size-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
