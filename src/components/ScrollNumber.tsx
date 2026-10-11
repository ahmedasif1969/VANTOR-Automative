export function ScrollNumber({ value }: { value: string }) {
  return (
    <span
      className="inline-block tabular-nums"
      style={{ minWidth: value.length + "ch" }}
    >
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" data-motion-number={value}>
        {value}
      </span>
    </span>
  );
}
