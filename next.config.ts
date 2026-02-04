import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";
import nextPwa from "next-pwa";

const parseEnvFile = (contents: string) => {
  const result: Record<string, string> = {};

  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) {
      result[key] = value;
    }
  });

  return result;
};

const appEnv = process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV;
if (appEnv === "staging") {
  const stagingPath = resolve(process.cwd(), ".env.staging");
  if (existsSync(stagingPath)) {
    const prodPath = resolve(process.cwd(), ".env.production");
    const stagingVars = parseEnvFile(readFileSync(stagingPath, "utf8"));
    const prodVars = existsSync(prodPath)
      ? parseEnvFile(readFileSync(prodPath, "utf8"))
      : {};

    for (const [key, value] of Object.entries(stagingVars)) {
      const currentValue = process.env[key];
      if (
        currentValue === undefined ||
        currentValue === "" ||
        currentValue === prodVars[key]
      ) {
        process.env[key] = value;
      }
    }
  }
}

const withPWA = nextPwa({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable:
    process.env.NODE_ENV === "development" &&
    process.env.PWA_ENABLED !== "true",
});

const nextConfig: NextConfig = {};

export default withPWA(nextConfig);
