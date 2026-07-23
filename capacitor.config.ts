const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config = {
  appId: "br.com.dsservicos.ponto",
  appName: "Ponto DS Serviços",
  webDir: "capacitor-web",
  bundledWebRuntime: false,
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: false,
        androidScheme: "https",
        allowNavigation: [new URL(serverUrl).hostname]
      }
    : undefined,
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV !== "production"
  },
  plugins: {
    Camera: {
      saveToGallery: false,
      allowEditing: false
    },
    Geolocation: {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  }
};

export default config;
