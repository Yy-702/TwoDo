declare module "next-pwa" {
  import type { NextConfig } from "next";

  type PWAPluginConfig = {
    dest: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
  };

  export default function withPWA(
    config: PWAPluginConfig
  ): (nextConfig: NextConfig) => NextConfig;
}
