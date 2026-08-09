import AppShell from '@/components/AppShell';

/* The nav shown here comes from who you are, not from the URL — a reseller
   editing a card at /admin/<id>/edit still sees the reseller's nav. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
