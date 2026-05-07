import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { RippleProvider } from "@/components/ripple-provider";
import { ToastHost } from "@/components/toast-host";
import { AuthBootstrap } from "@/components/auth-bootstrap";
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
  title: "BarakaBox",
  description: "Grocery delivery MVP",
  appleWebApp: {
    capable: true,
    title: "BarakaBox",
    statusBarStyle: "default",
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
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthBootstrap />
        <ToastHost />
        <RippleProvider />
        {children}
      </body>
    </html>
  );
}
