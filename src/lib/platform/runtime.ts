import type { RuntimePlatform } from "./types";

declare global {
  interface Window {
    Capacitor?: {
      getPlatform?: () => string;
      isNativePlatform?: () => boolean;
    };
  }
}

export function getRuntimePlatform(): RuntimePlatform {
  if (typeof window === "undefined") return "web";
  const platform = window.Capacitor?.getPlatform?.();
  return platform === "android" || platform === "ios" ? platform : "web";
}

export function isNativeRuntime(): boolean {
  if (typeof window === "undefined") return false;
  return window.Capacitor?.isNativePlatform?.() === true;
}
