import type { CameraGateway, CapturedPhoto } from "./types";

/**
 * Adaptador web preparado para o fluxo de ponto.
 * O Commit 02 implementará getUserMedia + canvas, sem input de arquivo ou galeria.
 */
export class WebCameraGateway implements CameraGateway {
  async captureLivePhoto(): Promise<CapturedPhoto> {
    throw new Error("Captura ao vivo será ativada no Commit 02.");
  }
}
