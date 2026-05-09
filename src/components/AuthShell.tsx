import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

interface AuthShellProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  showcaseTitle: string;
  showcaseCopy: string;
  showcaseStats: Array<{
    label: string;
    value: string;
  }>;
}

export default function AuthShell({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  showcaseTitle,
  showcaseCopy,
  showcaseStats,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-6xl items-stretch gap-5 lg:gap-8">
        <aside className="relative hidden flex-1 overflow-hidden rounded-[2rem] border border-white/40 bg-[linear-gradient(160deg,rgba(255,255,255,0.92),rgba(255,245,236,0.72))] p-8 shadow-[0_30px_90px_rgba(48,42,36,0.12)] lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.95),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(40,148,156,0.18),transparent_30%),radial-gradient(circle_at_70%_20%,rgba(239,99,81,0.16),transparent_24%)]" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-accent),var(--color-accent-strong))] text-white shadow-[0_16px_30px_rgba(239,99,81,0.28)]">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-[var(--color-muted)]">
                LifeFlow
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink-soft)]">
                Organizer codzienności z lepszym rytmem.
              </p>
            </div>
          </div>

          <div className="relative mt-auto space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-white/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-muted)]">
              <ArrowUpRight size={14} className="text-[var(--color-accent)]" />
              {eyebrow}
            </div>
            <div className="space-y-4">
              <h2 className="max-w-md font-display text-4xl font-bold tracking-[-0.06em] text-[var(--color-ink)]">
                {showcaseTitle}
              </h2>
              <p className="max-w-lg text-base leading-7 text-[var(--color-ink-soft)]">
                {showcaseCopy}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {showcaseStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.4rem] border border-white/60 bg-white/76 p-4 shadow-[0_18px_35px_rgba(48,42,36,0.08)] backdrop-blur-xl"
                >
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--color-muted)]">
                    {item.label}
                  </p>
                  <p className="mt-2 font-display text-3xl font-bold tracking-[-0.06em] text-[var(--color-ink)]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="mx-auto flex w-full max-w-[30rem] items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,249,244,0.9))] p-6 shadow-[0_28px_80px_rgba(48,42,36,0.14)] backdrop-blur-2xl sm:p-8"
          >
            <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(239,99,81,0.16),transparent_70%)]" />
            <div className="relative">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--color-muted)]">
                    {eyebrow}
                  </p>
                  <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.06em] text-[var(--color-ink)]">
                    {title}
                  </h1>
                  <p className="mt-3 max-w-md text-sm leading-6 text-[var(--color-ink-soft)]">
                    {subtitle}
                  </p>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.4rem] bg-[linear-gradient(135deg,var(--color-accent),var(--color-accent-strong))] text-white shadow-[0_16px_32px_rgba(239,99,81,0.3)]">
                  <Icon size={24} />
                </div>
              </div>

              <div className="space-y-5">{children}</div>

              {footer ? (
                <div className="mt-7 border-t border-[var(--color-line)] pt-5 text-sm text-[var(--color-ink-soft)]">
                  {footer}
                </div>
              ) : null}
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
