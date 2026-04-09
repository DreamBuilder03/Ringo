import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ringo — AI Phone Ordering for Restaurants",
  description:
    "The phone rings. Ringo handles it. AI-powered voice ordering that never misses a call, upsells automatically, and integrates with your POS.",
  openGraph: {
    title: "Ringo — AI Phone Ordering for Restaurants",
    description: "The phone rings. Ringo handles it.",
    url: "https://useringo.ai",
    siteName: "Ringo",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
