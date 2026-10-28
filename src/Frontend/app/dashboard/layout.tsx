import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bảng Điều Khiển | Culinary Blog',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-full">{children}</div>;
}
