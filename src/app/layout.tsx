import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { Code2 } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "vibe.code — chill and code",
  description: "A chill place to practice DSA with your friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
        <ThemeProvider>
          <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <Code2 size={14} className="text-white" />
                </div>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  vibe<span className="text-indigo-500">.code</span>
                </span>
              </Link>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 min-h-0">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
