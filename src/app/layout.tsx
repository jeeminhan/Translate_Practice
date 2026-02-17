import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import UserNav from "@/components/UserNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TranslateIO",
  description: "Japanese translation practice app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-gray-100 min-h-screen`}
      >
        <nav className="border-b border-gray-800 bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-8">
                <Link
                  href="/"
                  className="text-lg font-bold text-white tracking-tight"
                >
                  TranslateIO
                </Link>
                <div className="flex items-center gap-1">
                  <Link
                    href="/"
                    className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/import"
                    className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                  >
                    Import
                  </Link>
                  <Link
                    href="/vocabulary"
                    className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                  >
                    Vocabulary
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 text-sm text-blue-400 bg-blue-950 rounded-md">
                  JP → EN
                </span>
                <span
                  className="px-3 py-1.5 text-sm text-gray-500 bg-gray-800 rounded-md cursor-not-allowed"
                  title="Coming soon"
                >
                  EN → JP
                </span>
                <div className="ml-4 pl-4 border-l border-gray-800">
                  <UserNav />
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
