import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: copy.app.name,
  description: copy.app.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background font-body text-ink">{children}</body>
    </html>
  );
}
