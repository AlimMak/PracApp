import type { Metadata, Viewport } from "next";
import "./globals.css";
import PracticeAccountProvider from "@/components/practice-account";

export const metadata: Metadata = {
  title: "What is an API? · Interview Practice",
  description:
    "A little understanding. A little practice. Learn to explain an API in your own words with an interactive weather example.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f8f9fc",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PracticeAccountProvider>{children}</PracticeAccountProvider>
      </body>
    </html>
  );
}
