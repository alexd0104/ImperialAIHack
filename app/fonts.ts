import { Caveat, Fraunces, Nunito } from "next/font/google";

// Self-hosted at build time by next/font, so the House works offline in demo mode.
export const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

export const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

export const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

export const fontVariables = `${fraunces.variable} ${nunito.variable} ${caveat.variable}`;
