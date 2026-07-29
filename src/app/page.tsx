import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">vCard Studio</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
        Digital business cards that go live the moment you save them. Fill the
        form once — the card, the QR code, the vCard download and the share
        links all generate themselves.
      </p>
      <Link
        href="/admin"
        className="mt-7 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        Open admin
      </Link>
    </div>
  );
}
