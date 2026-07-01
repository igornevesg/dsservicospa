import type { HTMLAttributes } from "react";

type LocalVideoProps = {
  src: string;
  poster?: string;
  label: string;
  className?: string;
  preload?: "none" | "metadata" | "auto";
} & Pick<HTMLAttributes<HTMLVideoElement>, "aria-hidden">;

export function LocalVideo({
  src,
  poster,
  label,
  className = "",
  preload = "metadata",
  "aria-hidden": ariaHidden = true
}: LocalVideoProps) {
  return (
    <video
      className={`local-video ${className}`}
      autoPlay
      muted
      loop
      playsInline
      preload={preload}
      poster={poster}
      aria-label={label}
      aria-hidden={ariaHidden}
    >
      <source src={src} type="video/mp4" />
      Seu navegador não suporta vídeos HTML5.
    </video>
  );
}
