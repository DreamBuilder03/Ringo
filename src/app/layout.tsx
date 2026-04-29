import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OMRI — AI Phone Ordering for Restaurants",
  description:
    "The phone rings. OMRI handles it. AI-powered voice ordering that never misses a call, upsells automatically, and integrates with your POS.",
  openGraph: {
    title: "OMRI — AI Phone Ordering for Restaurants",
    description: "The phone rings. OMRI handles it.",
    url: "https://omriapp.com",
    siteName: "OMRI",
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
