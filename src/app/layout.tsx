import type { Metadata } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
      variable: "--font-display",
      });

      export const metadata: Metadata = {
        title: "World Cup 2026 Predictor",
          description: "Predictor inteligente del Mundial 2026 con modelo estadístico",
          };

          export default function RootLayout({
            children,
            }: Readonly<{
              children: React.ReactNode;
              }>) {
                return (
                    <html lang="es">
                          <body className={`${inter.variable} ${barlowCondensed.variable}`}>
                                  {children}
                                        </body>
                                            </html>
                                              );
                                              }
