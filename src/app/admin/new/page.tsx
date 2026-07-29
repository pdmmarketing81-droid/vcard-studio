import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminForm from '@/components/AdminForm';
import { isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default function NewCardPage() {
  if (!isAdmin()) redirect('/admin/login');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">New card</h1>
        <Link href="/admin" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
          ← All cards
        </Link>
      </div>
      <AdminForm />
    </div>
  );
}
