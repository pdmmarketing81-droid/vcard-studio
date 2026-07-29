import type { ResolvedDesign } from '@/lib/design';
import { panelClass, revealClass } from '@/lib/design';

export default function Section({
  d,
  titleRule = false,
  title,
  subtitle,
  children,
  padded = true,
  delay = 0,
}: {
  d: ResolvedDesign;
  titleRule?: boolean;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  padded?: boolean;
  /** Stagger index — sections cascade in rather than all landing at once. */
  delay?: number;
}) {
  return (
    <section
      className={`${panelClass(d)} ${revealClass(d)} ${padded ? 'p-5' : 'overflow-hidden'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {title && (
        <header className={padded ? 'mb-4' : 'px-5 pb-3 pt-5'}>
          <h2 className={`section-title ${titleRule ? 'title-rule' : ''}`}>{title}</h2>
          {subtitle && <p className="mt-1 text-center text-xs opacity-60">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
