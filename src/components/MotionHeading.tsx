/** Keep one natural accessible heading while moving its visual lines separately. */
export function MotionHeading({
  lines,
  className = "section-title",
}: {
  lines: string[];
  className?: string;
}) {
  return (
    <h2 className={className} data-motion-heading>
      <span className="sr-only">{lines.join(" ")}</span>
      <span aria-hidden="true">
        {lines.map((line) => (
          <span className="motion-line-mask" key={line}>
            <span className="motion-heading-line">{line}</span>
          </span>
        ))}
      </span>
    </h2>
  );
}
