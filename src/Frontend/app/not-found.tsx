import Link from 'next/link';
import { Button } from '@/components/ui/button';
export default function NotFound() { return <div className="mx-auto max-w-lg px-4 py-20 text-center"><p className="text-5xl font-bold text-orange-600">404</p><h1 className="my-5 text-2xl font-bold">Không tìm thấy trang</h1><p className="mb-6 text-neutral-600">Trang hoặc công thức bạn cần có thể đã được chuyển hoặc xóa.</p><Button asChild><Link href="/">Về trang chủ</Link></Button></div>; }
