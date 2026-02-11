import type { Metadata, Viewport } from "next";
import { AppFooter } from "@/components/chrome/app-footer";
import { BrandPaletteSync } from "@/components/chrome/brand-palette-sync";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocFlow Actions",
  description: "Transforma edital em plano executavel com evidencia"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <BrandPaletteSync />
        <div className="site-root">
          <div className="site-content">{children}</div>
          <AppFooter />
        </div>
      </body>
    </html>
  );
}
