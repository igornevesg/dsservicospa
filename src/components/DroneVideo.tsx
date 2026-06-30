"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function DroneVideo() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.classList.add("modal-open");
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="drone-image"
        aria-label="Assistir vídeo de monitoramento com drone"
        onClick={() => setOpen(true)}
      >
        <span className="play">▶</span>
      </button>

      {open && (
        <div className="video-modal" role="dialog" aria-modal="true" aria-label="Vídeo de monitoramento com drone">
          <button className="video-backdrop" aria-label="Fechar vídeo" onClick={() => setOpen(false)} />
          <div className="video-modal-card">
            <button className="video-close" aria-label="Fechar vídeo" onClick={() => setOpen(false)}>
              <X size={26} />
            </button>
            <div className="video-frame">
              <iframe
                src="https://www.youtube.com/embed/5JXPpSRvHTA?autoplay=1&rel=0&modestbranding=1"
                title="Monitoramento com drone DS Serviços"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
