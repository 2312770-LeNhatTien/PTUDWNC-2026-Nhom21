"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer id="about" className="border-t border-neutral-200 bg-neutral-900 text-neutral-300">
      {/* Top Footer */}
      <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Col 1: Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white font-bold">
                🍳
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">
                Culinary<span className="text-orange-500">Blog</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-neutral-400 max-w-sm">
              Nền tảng chia sẻ và lưu trữ công thức nấu ăn chuẩn vị Việt Nam. Kết nối những người đam mê ẩm thực, khám phá hương vị truyền thống và hiện đại.
            </p>
            <div className="pt-2 text-xs text-neutral-400 space-y-1">
              <p className="font-semibold text-neutral-300">Culinary Blog</p>
              <p>Cộng đồng chia sẻ ẩm thực & công thức nấu ăn trực tuyến.</p>
              <p>© 2026 CulinaryBlog. All rights reserved.</p>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Khám Phá</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-400">
              <li>
                <Link href="/" className="hover:text-orange-400 transition-colors">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link href="/recipes" className="hover:text-orange-400 transition-colors">
                  Tất cả công thức
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-orange-400 transition-colors">
                  Danh mục món ăn
                </Link>
              </li>
              <li>
                <Link href="/dashboard/recipes/new" className="hover:text-orange-400 transition-colors">
                  Đăng công thức mới
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Categories */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Danh Mục</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-400">
              <li>
                <Link href="/categories" className="hover:text-orange-400 transition-colors">
                  Món Chính
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-orange-400 transition-colors">
                  Món Nước & Canh
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-orange-400 transition-colors">
                  Khai Vị & Ăn Vặt
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-orange-400 transition-colors">
                  Món Tráng Miệng
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-orange-400 transition-colors">
                  Món Chay Thanh Tịnh
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Newsletter */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Bản Tin Ẩm Thực</h3>
            <p className="mt-4 text-xs text-neutral-400 leading-relaxed">
              Nhận công thức nấu ăn mới và mẹo vặt nhà bếp hay nhất gửi đến hộp thư mỗi tuần.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="mt-4 space-y-2">
              <input
                type="email"
                placeholder="Nhập email của bạn..."
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3.5 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-orange-700 transition-colors"
              >
                Đăng ký nhận tin
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-neutral-800 bg-neutral-950 py-6">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 lg:px-8 text-xs text-neutral-500 gap-4">
          <p>© 2026 Culinary Blog — Nhóm 21. Bản quyền được bảo lưu.</p>
          <div className="flex items-center gap-6">
            <span>Thành viên: Tiến, Đức, Toàn, Tuấn</span>
            <span>•</span>
            <span>Khoa CNTT - ĐH Đà Lạt</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
