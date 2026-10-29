import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/language";

export const metadata: Metadata = {
  title: "Leo's Juice & Burger — Staff dashboard",
  description: "Reservations and daily service at Leo's Juice & Burger.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body><LanguageProvider>{children}</LanguageProvider></body></html>;
}
