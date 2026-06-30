import { YouTubeBackground } from "@/components/YouTubeBackground";

export function DroneVideo() {
  return (
    <div className="drone-video-inline" aria-label="Vídeo de monitoramento com drone em reprodução automática">
      <YouTubeBackground
        videoId="5JXPpSRvHTA"
        title="Monitoramento com drone DS Serviços"
        className="drone-loop-video"
      />
    </div>
  );
}
