import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shared Flat OS",
  description: "Website for Ankit, Jayash, Rahul and Lakshit to run the flat.",
  applicationName: "Flat OS",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#14110f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-paper text-ink antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
