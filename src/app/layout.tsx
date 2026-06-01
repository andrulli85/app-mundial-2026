import type { Metadata, Viewport } from "next";
import { Anton, Archivo } from "next/font/google";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";
import AuthProvider from "@/components/AuthProvider";
import AchievementProvider from "@/components/AchievementProvider";
import TopBarGlobal from "@/components/TopBarGlobal";

/* ============================================================
   Font loading — next/font/google for zero-CLS preload

   Note: "Archivo Expanded" is not available in next/font/google's
   catalog. We use Archivo at weight 800-900 for --font-wide
   (premium wide headings), which closely matches the design intent.
   Anton covers --font-display (condensed impact caps).
   Both --font-ui and --font-stat resolve to Archivo.
   ============================================================ */
const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const archivo = Archivo({
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  // Single variable — CSS overrides --font-ui and --font-wide from this
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Albumix",
  description: "Tu álbum digital del Mundial 2026",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Albumix",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    other: [
      {
        rel: "apple-touch-startup-image",
        url: "/splash/iphone-640x1136.png",
        media:
          "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        rel: "apple-touch-startup-image",
        url: "/splash/iphone-750x1334.png",
        media:
          "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        rel: "apple-touch-startup-image",
        url: "/splash/iphone-1179x2556.png",
        media:
          "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        rel: "apple-touch-startup-image",
        url: "/splash/iphone-1170x2532.png",
        media:
          "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        rel: "apple-touch-startup-image",
        url: "/splash/iphone-1284x2778.png",
        media:
          "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        rel: "apple-touch-startup-image",
        url: "/splash/iphone-1290x2796.png",
        media:
          "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 2,
  userScalable: true,
  viewportFit: "cover",
  // Updated to dark theme — matches --bg-1 from design system
  themeColor: "#0D0F13",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`h-full antialiased ${anton.variable} ${archivo.variable}`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <AchievementProvider>
            {/*
              TopBarGlobal renders the fixed 54px header bar.
              It suppresses itself on "/" (onboarding) and "/notifications".
            */}
            <TopBarGlobal />
            <div className="flex-1 flex flex-col">
              {children}
            </div>
          </AchievementProvider>
        </AuthProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
