import type { LocationGateway, PositionEvidence } from "./types";

export class WebLocationGateway implements LocationGateway {
  async getCurrentPosition(): Promise<PositionEvidence> {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      throw new Error("Este aparelho não disponibiliza geolocalização.");
    }
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      });
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracyMeters: position.coords.accuracy,
      capturedAt: new Date(position.timestamp).toISOString(),
    };
  }
}
