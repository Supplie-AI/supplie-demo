import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Annona — Grounding Demo",
  description: "Annona Grounding Demo for Zeder Corporation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
