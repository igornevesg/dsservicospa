import { getRuntimePlatform } from "./runtime";
import type { DeviceEvidence, DeviceGateway } from "./types";

const STORAGE_KEY = "ds_ponto_installation_id";

function installationId() {
  if (typeof window === "undefined") return undefined;
  let value = window.localStorage.getItem(STORAGE_KEY);
  if (!value) {
    value = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, value);
  }
  return value;
}

export class WebDeviceGateway implements DeviceGateway {
  async getEvidence(): Promise<DeviceEvidence> {
    return {
      platform: getRuntimePlatform(),
      operatingSystem: typeof navigator === "undefined" ? undefined : navigator.platform,
      model: typeof navigator === "undefined" ? undefined : navigator.userAgent.slice(0, 180),
      installationId: installationId(),
    };
  }
}
