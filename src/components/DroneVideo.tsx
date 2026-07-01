import { LocalVideo } from "@/components/LocalVideo";

export function DroneVideo() {
  return (
    <div className="drone-video-inline" aria-label="Vídeo de monitoramento com drone em reprodução automática">
      <LocalVideo
        src="/videos/drone.mp4"
        poster="/logo-ds-servicos.png"
        label="Monitoramento com drone DS Serviços"
        className="drone-loop-video"
      />
    </div>
  );
}
