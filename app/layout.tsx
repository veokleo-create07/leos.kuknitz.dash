import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leo's Juice & Burger — Staff dashboard",
  description: "Reservations, guest inquiries, and daily service at Leo's Juice & Burger.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
