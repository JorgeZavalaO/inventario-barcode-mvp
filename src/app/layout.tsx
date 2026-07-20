import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/session-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "StockScan | Inventario colaborativo",
  description: "MVP de conteo de inventario multiusuario mediante códigos de barras.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1324",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable)}>
      <body>
        <SessionProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
