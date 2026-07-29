import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl">🔍</p>
      <h1 className="mt-4 text-xl font-bold text-slate-800">Card not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        This card doesn&apos;t exist, or it hasn&apos;t been published yet.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
      >
        Go home
      </Link>
    </div>
  );
}
