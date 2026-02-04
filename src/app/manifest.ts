import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chereh",
    short_name: "Chereh",
    description: "Chereh website",
    start_url: "/",
    display: "standalone",
    background_color: "#f6fbfc",
    theme_color: "#0097a7",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/maskable-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
