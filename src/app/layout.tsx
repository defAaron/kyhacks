import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import { Providers } from "@/components/Providers";
import { cn } from "@/lib/utils";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SurplusLink",
    template: "%s · SurplusLink",
  },
  description:
    "Connect surplus food from restaurants and pantries to people nearby.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(bricolage.variable, figtree.variable, "font-sans")}
    >
      <body className="antialiased" suppressHydrationWarning>
        <Providers>
          <AppHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
