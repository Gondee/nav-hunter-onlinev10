import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAV-Hunter Online",
  description: "Real-time SEC filing monitoring and AI-powered market analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}