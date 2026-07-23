export type RuntimePlatform = "web" | "android" | "ios";

export interface CapturedPhoto {
  dataUrl: string;
  capturedAt: string;
  source: "live-camera";
}

export interface PositionEvidence {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
}

export interface DeviceEvidence {
  platform: RuntimePlatform;
  model?: string;
  operatingSystem?: string;
  appVersion?: string;
  installationId?: string;
}

export interface CameraGateway {
  captureLivePhoto(): Promise<CapturedPhoto>;
}

export interface LocationGateway {
  getCurrentPosition(): Promise<PositionEvidence>;
}

export interface DeviceGateway {
  getEvidence(): Promise<DeviceEvidence>;
}
