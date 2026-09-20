import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.marinpaunovic.towerdefense",
  appName: "Tower Defense",
  webDir: ".output/public",
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 900,
      backgroundColor: "#050816",
      showSpinner: false,
    },
  },
};

export default config;
