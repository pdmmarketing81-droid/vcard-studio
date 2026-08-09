import AppShell from '@/components/AppShell';

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
