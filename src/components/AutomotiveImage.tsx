import { useState, type ImgHTMLAttributes } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function AutomotiveImage({
  src,
  alt,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      {...props}
      src={failed ? "/videos/hero-frames/desktop/frame-001.webp" : src}
      alt={failed ? "Automotive fallback — model photograph unavailable" : alt}
      loading="lazy"
      decoding="async"
      onLoad={() => ScrollTrigger.refresh(true)}
      onError={() => setFailed(true)}
    />
  );
}
