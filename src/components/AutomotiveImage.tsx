import { useState, type ImgHTMLAttributes } from "react";

export function AutomotiveImage({
  src,
  alt,
  sizes,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  const base = src?.match(/^\/images\/(gt3|porsche|supercar|performance|grand-tourer|mustang)\.jpg$/)?.[1];
  const responsiveSizes = sizes ?? (
    props.className?.includes("featured-image")
      ? "(max-width: 767px) calc(100vw - 40px), (max-width: 1023px) calc(100vw - 80px), min(1600px, calc(100vw - 128px))"
      : props.className?.includes("pointer-image")
        ? "(max-width: 767px) calc(100vw - 40px), (max-width: 1279px) 50vw, 33vw"
        : "(max-width: 767px) calc(100vw - 40px), (max-width: 1023px) 50vw, 45vw"
  );
  return (
    <img
      {...props}
      src={failed ? "/videos/hero-frames/desktop/frame-001.webp" : base ? `/images/${base}-1280.webp` : src}
      srcSet={!failed && base ? [480, 800, 1280, ...(base === "gt3" ? [] : [1800])].map(width => `/images/${base}-${width}.webp ${width}w`).join(", ") : undefined}
      sizes={!failed && base ? responsiveSizes : sizes}
      alt={failed ? "Automotive fallback — model photograph unavailable" : alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
