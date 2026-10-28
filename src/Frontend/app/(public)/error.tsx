'use client';

export default function PublicError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-xl p-10 text-center" role="alert">
    <h1 className="text-2xl font-semibold">Không thể tải nội dung</h1>
    <p className="my-4">Dịch vụ tạm thời gặp sự cố. Vui lòng thử lại.</p>
    <button onClick={reset} className="rounded-xl bg-orange-600 px-5 py-3 text-white">Thử lại</button>
  </main>;
}
