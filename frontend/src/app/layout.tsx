import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { RippleProvider } from "@/components/ripple-provider";
import { ToastHost } from "@/components/toast-host";
import { AuthBootstrap } from "@/components/auth-bootstrap";
import { ApplePwaHead } from "@/components/pwa/ApplePwaHead";
import { PWAProvider } from "@/components/pwa/PWAProvider";
import { StorefrontScrollRestore } from "@/components/navigation/storefront-scroll-restore";
import { absoluteUrl, getSiteUrl } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Chust Online Bozor",
    template: "%s | Chust Online Bozor",
  },
  description:
    "Chust Online Bozor — oziq-ovqat va kundalik mahsulotlarni tez yetkazib beradigan zamonaviy marketplace.",
  keywords: [
    "Chust Online Bozor",
    "online bozor",
    "oziq-ovqat",
    "marketplace",
    "yetkazib berish",
    "Uzbekistan grocery",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    url: getSiteUrl(),
    siteName: "Chust Online Bozor",
    title: "Chust Online Bozor",
    description:
      "Mahsulotlar, kategoriyalar va chegirmalar bilan premium grocery marketplace tajribasi.",
    images: [
      {
        url: absoluteUrl("/og-image.png"),
        width: 1200,
        height: 630,
        alt: "Chust Online Bozor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chust Online Bozor",
    description:
      "Mahsulotlar, kategoriyalar va chegirmalar bilan premium grocery marketplace tajribasi.",
    images: [absoluteUrl("/og-image.png")],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Chust Online Bozor",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#F7F7F7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <ApplePwaHead />
      </head>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Chust Online Bozor",
              url: getSiteUrl(),
              logo: absoluteUrl("/icon-192.png"),
            }),
          }}
        />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Chust Online Bozor",
              url: getSiteUrl(),
              potentialAction: {
                "@type": "SearchAction",
                target: `${getSiteUrl()}/?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <PWAProvider>
          <AuthBootstrap />
          <ToastHost />
          <RippleProvider />
          <StorefrontScrollRestore />
          {children}
        </PWAProvider>
      </body>
    </html>
  );
}
