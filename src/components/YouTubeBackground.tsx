"use client";

import { useEffect, useRef, useState } from "react";

type YouTubeBackgroundProps = {
  videoId: string;
  title: string;
  className?: string;
  iframeClassName?: string;
};

export function YouTubeBackground({ videoId, title, className = "", iframeClassName = "" }: YouTubeBackgroundProps) {
  const [loaded, setLoaded] = useState(false);
  const loadTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (loadTimer.current) {
        window.clearTimeout(loadTimer.current);
      }
    };
  }, []);

  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    loop: "1",
    playlist: videoId,
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    disablekb: "1",
    fs: "0",
    iv_load_policy: "3",
    cc_load_policy: "0",
    start: "1"
  });

  return (
    <div className={`youtube-background ${className}`} aria-hidden="true">
      <iframe
        className={`youtube-background-frame ${loaded ? "is-loaded" : ""} ${iframeClassName}`}
        src={`https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture"
        tabIndex={-1}
        loading="eager"
        onLoad={() => {
          loadTimer.current = window.setTimeout(() => setLoaded(true), 1200);
        }}
      />
    </div>
  );
}
