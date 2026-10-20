import type { Metadata } from "next";
import { Providers } from "./providers";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: { template: "%s | Culinary Blog", default: "Culinary Blog — Khám Phá & Chia Sẻ Ẩm Thực Việt" },
  description: "Cộng đồng chia sẻ công thức nấu ăn chuẩn vị Việt Nam. Khám phá hàng trăm món ngon, mẹo bếp và công thức dinh dưỡng mỗi ngày.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="scroll-smooth">
      <body className="min-h-screen bg-neutral-50/60 font-sans text-neutral-800 antialiased flex flex-col">
        <Providers>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:p-3">Đến nội dung chính</a>
          <Navbar />
          <div id="main-content" tabIndex={-1} className="flex-1">
            {children}
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
