declare module "next-pwa" {
  import type { NextConfig } from "next";

  export type PWAOptions = {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    [key: string]: unknown;
  };

  export default function nextPwa(
    options: PWAOptions
  ): (nextConfig: NextConfig) => NextConfig;
}
