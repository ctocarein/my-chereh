import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import AuthRedirectListener from "@/components/auth/AuthRedirectListener";
import ReferralCapture from "@/components/referrals/ReferralCapture";
import NetworkErrorToast from "@/components/system/NetworkErrorToast";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
  fallback: ["-apple-system", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Chereh",
  description: "Chereh website",
  applicationName: "Chereh",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Chereh",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#1FA6B8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <AuthRedirectListener />
        <Suspense fallback={null}>
          <ReferralCapture />
        </Suspense>
        <NetworkErrorToast />
        {children}
      </body>
    </html>
  );
}
