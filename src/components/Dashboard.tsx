import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, format, startOfWeek } from 'date-fns';
import { pl } from 'date-fns/locale';
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  CalendarClock,
  CheckCheck,
  Clock3,
  Flame,
  MessageSquareText,
  NotebookPen,
  PiggyBank,
  Plus,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  WifiOff,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { useHabits } from '../hooks/useHabits';
import { useBudget } from '../hooks/useBudget';
import { useNotes } from '../hooks/useNotes';
import { useGoals } from '../hooks/useGoals';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { useStats } from '../hooks/useStats';
import { useMessages } from '../hooks/useMessages';
import { useWeekStats } from '../hooks/useWeekStats';
import { useToast } from '../context/ToastContext';
import { useOffline } from '../context/OfflineContext';

type PanelProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

type MetricCardProps = {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  to: string;
  accent: string;
  accentSoft: string;
  progress?: number;
};

function toDateValue(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    const parsed = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function formatDueDateLabel(value?: string) {
  if (!value) {
    return 'Bez terminu';
  }

  const parsed = toDateValue(value);

  if (!parsed) {
    return value;
  }

  const sameDay = format(parsed, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  return sameDay
    ? `Dziś, ${format(parsed, 'HH:mm', { locale: pl })}`
    : format(parsed, 'd MMMM', { locale: pl });
}

function Panel({ title, description, action, className, children }: PanelProps) {
  return (
    <section className={cn('surface-panel noise relative overflow-hidden p-5 sm:p-6', className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-2xl font-bold tracking-[-0.06em] text-[var(--color-ink)]">
            {title}
          </p>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-[var(--color-ink-soft)]">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  to,
  accent,
  accentSoft,
  progress,
}: MetricCardProps) {
  return (
    <Link to={to}>
      <motion.article
        whileHover={{ y: -3, scale: 1.01 }}
        whileTap={{ scale: 0.985 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="surface-panel h-full overflow-hidden p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-[1.2rem]"
            style={{ backgroundColor: accentSoft }}
          >
            <Icon size={20} style={{ color: accent }} />
          </div>
          <ArrowRight size={16} className="text-[var(--color-muted)]" />
        </div>
        <p className="mt-5 text-overline">{title}</p>
        <p className="mt-2 font-display text-3xl font-bold tracking-[-0.06em] text-[var(--color-ink)]">
          {value}
        </p>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{detail}</p>
        {typeof progress === 'number' ? (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(32,26,23,0.06)]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%`, backgroundColor: accent }}
            />
          </div>
        ) : null}
      </motion.article>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { tasks, loading: tasksLoading, error: tasksError } = useTasks();
  const { habits, loading: habitsLoading } = useHabits();
  const { transactions, analytics: budgetAnalytics, loading: budgetLoading, error: budgetError } = useBudget();
  const { notesCount, loading: notesLoading } = useNotes();
  const { goalsCount, goalsInProgress, goalsCompleted, loading: goalsLoading } = useGoals();
  const { calendarEvents, loading: calendarLoading } = useCalendarEvents();
  const { stats, loading: statsLoading } = useStats();
  const { messages, sendMessage, loading: messagesLoading } = useMessages();
  const { weekStats, loading: weekStatsLoading } = useWeekStats();
  const { showToast } = useToast();
  const { isOffline } = useOffline();

  const [newMessage, setNewMessage] = useState('');

  const isLoading =
    tasksLoading ||
    habitsLoading ||
    budgetLoading ||
    notesLoading ||
    goalsLoading ||
    calendarLoading ||
    statsLoading ||
    messagesLoading ||
    weekStatsLoading;

  const currentDate = new Date();
  const todayKey = format(currentDate, 'yyyy-MM-dd');
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const formattedDate = format(currentDate, 'EEEE, d MMMM', { locale: pl });
  const firstName = user?.displayName?.split(' ')[0] || 'Przyjacielu';

  const openTasks = useMemo(() => tasks.filter((task) => !task.completed), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.completed), [tasks]);
  const todayTasks = useMemo(
    () => openTasks.filter((task) => (task.dueDate ? task.dueDate.slice(0, 10) === todayKey : false)),
    [openTasks, todayKey],
  );
  const focusTasks = useMemo(
    () => (todayTasks.length > 0 ? todayTasks.slice(0, 5) : openTasks.slice(0, 5)),
    [openTasks, todayTasks],
  );
  const completedToday = useMemo(
    () =>
      completedTasks.filter((task) => {
        const completedAt = toDateValue(task.completedAt);
        return completedAt ? format(completedAt, 'yyyy-MM-dd') === todayKey : false;
      }).length,
    [completedTasks, todayKey],
  );

  const habitsDoneToday = useMemo(
    () => habits.filter((habit) => habit.completions?.[todayKey]).length,
    [habits, todayKey],
  );

  const currentStreak = useMemo(
    () => Math.max(stats?.streak ?? 0, ...habits.map((habit) => habit.streak ?? 0), 0),
    [habits, stats?.streak],
  );

  const todayEvents = useMemo(
    () => calendarEvents.filter((event) => event.date === todayKey).slice(0, 4),
    [calendarEvents, todayKey],
  );

  const nextEvents = useMemo(
    () =>
      calendarEvents
        .filter((event) => event.date >= todayKey)
        .sort((left, right) => left.date.localeCompare(right.date))
        .slice(0, 5),
    [calendarEvents, todayKey],
  );

  const levelProgress = useMemo(() => {
    const xp = stats?.xp ?? 0;
    const xpToNextLevel = Math.max(stats?.xpToNextLevel ?? 1, 1);
    return Math.round(Math.min(100, (xp / xpToNextLevel) * 100));
  }, [stats?.xp, stats?.xpToNextLevel]);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekStart, index);
        const key = format(date, 'yyyy-MM-dd');
        const completed = completedTasks.filter((task) => {
          const completedAt = toDateValue(task.completedAt);
          return completedAt ? format(completedAt, 'yyyy-MM-dd') === key : false;
        }).length;

        return {
          key,
          shortLabel: format(date, 'EEEEE', { locale: pl }),
          value: completed,
          isToday: key === todayKey,
        };
      }),
    [completedTasks, todayKey, weekStart],
  );

  const maxWeekValue = useMemo(
    () => Math.max(...weekDays.map((day) => day.value), 1),
    [weekDays],
  );

  const messagePreview = useMemo(() => [...messages].slice(0, 3).reverse(), [messages]);

  const insights = useMemo(
    () => [
      `${openTasks.length} otwartych zadań czeka na decyzję.`,
      `${habitsDoneToday}/${habits.length || 0} nawyków odhaczonych na dziś.`,
      `${todayEvents.length} wydarzeń zaplanowanych na dziś.`,
    ],
    [habits.length, habitsDoneToday, openTasks.length, todayEvents.length],
  );

  const primaryError = tasksError || budgetError;

  const sendCurrentMessage = async () => {
    const trimmedMessage = newMessage.trim();

    if (!trimmedMessage) {
      showToast({ type: 'warning', message: 'Wpisz wiadomość, zanim ją wyślesz.' });
      return;
    }

    if (trimmedMessage.length > 500) {
      showToast({ type: 'warning', message: 'Wiadomość może mieć maksymalnie 500 znaków.' });
      return;
    }

    if (isOffline) {
      showToast({ type: 'offline', message: 'Wysyłanie wiadomości jest niedostępne offline.' });
      return;
    }

    try {
      await sendMessage(trimmedMessage);
      setNewMessage('');
      showToast({ type: 'success', message: 'Wiadomość została wysłana.' });
    } catch {
      showToast({ type: 'error', message: 'Nie udało się wysłać wiadomości.' });
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {primaryError ? (
        <div className="rounded-[1.5rem] border border-[rgba(211,91,87,0.18)] bg-[rgba(211,91,87,0.08)] px-5 py-4 text-sm font-semibold text-[var(--color-danger)]">
          {primaryError}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,240,230,0.9))] p-6 shadow-[0_28px_80px_rgba(48,42,36,0.14)] sm:p-7">
          <div className="absolute right-[-4rem] top-[-4rem] h-40 w-40 rounded-full bg-[rgba(239,99,81,0.14)] blur-3xl" />
          <div className="absolute bottom-[-5rem] left-[-3rem] h-40 w-40 rounded-full bg-[rgba(40,148,156,0.12)] blur-3xl" />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge bg-[rgba(239,99,81,0.1)] text-[var(--color-accent)]">
                <Sparkles size={12} />
                Nowy rytm dnia
              </span>
              {isOffline ? (
                <span className="badge bg-[rgba(211,91,87,0.1)] text-[var(--color-danger)]">
                  <WifiOff size={12} />
                  Offline
                </span>
              ) : null}
            </div>

            <p className="mt-5 text-overline capitalize">{formattedDate}</p>
            <h1 className="mt-2 max-w-2xl font-display text-4xl font-bold tracking-[-0.08em] text-[var(--color-ink)] sm:text-5xl">
              Dzień dobry, {firstName}. Zobaczmy, co dziś najbardziej pcha Cię do przodu.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-ink-soft)]">
              Masz {openTasks.length} aktywnych zadań, {todayEvents.length} wydarzeń na dziś i serię {currentStreak} dni konsekwencji.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {insights.map((item) => (
                <div key={item} className="rounded-[1.3rem] border border-white/70 bg-white/72 px-4 py-4 backdrop-blur-xl">
                  <p className="text-sm font-semibold leading-6 text-[var(--color-ink)]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="surface-panel flex flex-col justify-between gap-5 p-6">
          <div>
            <p className="text-overline">Postęp poziomu</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="font-display text-4xl font-bold tracking-[-0.08em] text-[var(--color-ink)]">
                  {(stats?.xp ?? 0).toLocaleString('pl-PL')}
                </p>
                <p className="text-sm text-[var(--color-ink-soft)]">
                  {stats?.xpToNextLevel ?? 1000} XP do kolejnego poziomu
                </p>
              </div>
              <div className="rounded-[1.2rem] bg-[rgba(40,148,156,0.08)] px-3 py-2 text-right">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-calm)]">
                  Level
                </p>
                <p className="font-display text-2xl font-bold tracking-[-0.06em] text-[var(--color-ink)]">
                  {stats?.level ?? 1}
                </p>
              </div>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-[rgba(32,26,23,0.06)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(135deg,var(--color-accent),var(--color-calm))] transition-all duration-500"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/tasks"
              className="rounded-[1.35rem] border border-[var(--color-line)] bg-[rgba(239,99,81,0.08)] px-4 py-4 transition-transform hover:-translate-y-0.5"
            >
              <p className="text-overline">Zadania</p>
              <p className="mt-2 text-sm font-bold text-[var(--color-ink)]">Dodaj szybki focus</p>
            </Link>
            <Link
              to="/calendar"
              className="rounded-[1.35rem] border border-[var(--color-line)] bg-[rgba(40,148,156,0.08)] px-4 py-4 transition-transform hover:-translate-y-0.5"
            >
              <p className="text-overline">Kalendarz</p>
              <p className="mt-2 text-sm font-bold text-[var(--color-ink)]">Zobacz plan tygodnia</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Zadania"
          value={String(openTasks.length)}
          detail={`${completedToday} ukończonych dzisiaj`}
          icon={CheckCheck}
          to="/tasks"
          accent="#ef6351"
          accentSoft="rgba(239,99,81,0.12)"
          progress={tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0}
        />
        <MetricCard
          title="Nawyki"
          value={`${habitsDoneToday}/${habits.length || 0}`}
          detail={`Seria ${currentStreak} dni`}
          icon={Flame}
          to="/habits"
          accent="#ea8f3b"
          accentSoft="rgba(242,169,59,0.14)"
          progress={habits.length ? Math.round((habitsDoneToday / habits.length) * 100) : 0}
        />
        <MetricCard
          title="Budżet"
          value={`${budgetAnalytics.balance.toFixed(0)} zł`}
          detail={`${transactions.length} zapisanych transakcji`}
          icon={Wallet}
          to="/budget"
          accent="#28949c"
          accentSoft="rgba(40,148,156,0.12)"
          progress={budgetAnalytics.totalIncome > 0 ? Math.round((budgetAnalytics.balance / budgetAnalytics.totalIncome) * 100) : 0}
        />
        <MetricCard
          title="Cele"
          value={String(goalsInProgress)}
          detail={`${goalsCompleted}/${goalsCount || 0} ukończonych`}
          icon={Target}
          to="/goals"
          accent="#8e5cf1"
          accentSoft="rgba(142,92,241,0.12)"
          progress={goalsCount ? Math.round((goalsCompleted / goalsCount) * 100) : 0}
        />
      </section>

      {isLoading ? (
        <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <div className="surface-panel space-y-4 p-6">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-20 w-full rounded-[1.4rem]" />
            <div className="skeleton h-20 w-full rounded-[1.4rem]" />
            <div className="skeleton h-20 w-full rounded-[1.4rem]" />
          </div>
          <div className="surface-panel space-y-4 p-6">
            <div className="skeleton h-5 w-32" />
            <div className="skeleton h-56 w-full rounded-[1.4rem]" />
          </div>
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <div className="space-y-4">
            <Panel
              title="Dzisiejszy focus"
              description={
                todayTasks.length > 0
                  ? 'Najbliższe zadania zaplanowane na dziś.'
                  : 'Nie masz terminów na dziś, więc pokazuję najważniejsze otwarte rzeczy.'
              }
              action={
                <Link
                  to="/tasks"
                  className="inline-flex items-center gap-2 rounded-full bg-[rgba(32,26,23,0.06)] px-3 py-2 text-xs font-bold text-[var(--color-ink)] transition-colors hover:bg-[rgba(32,26,23,0.1)]"
                >
                  <Plus size={14} />
                  Dodaj
                </Link>
              }
            >
              <div className="space-y-3">
                {focusTasks.length > 0 ? (
                  focusTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-[1.35rem] border border-[var(--color-line)] bg-white/72 px-4 py-4"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-[rgba(239,99,81,0.1)] text-[var(--color-accent)]">
                        <CheckCheck size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[var(--color-ink)]">{task.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-soft)]">
                          <span className="rounded-full bg-[rgba(32,26,23,0.05)] px-2 py-1">
                            {task.category || 'inne'}
                          </span>
                          <span>{formatDueDateLabel(task.dueDate)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.4rem] border border-dashed border-[var(--color-line-strong)] bg-white/65 px-5 py-8 text-center">
                    <p className="font-display text-2xl font-bold tracking-[-0.06em] text-[var(--color-ink)]">
                      Czysta karta
                    </p>
                    <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
                      Nie ma dziś żadnych aktywnych zadań. Dobry moment na nowe priorytety.
                    </p>
                  </div>
                )}
              </div>
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel
                title="Nawyki na dziś"
                description="Krótki podgląd konsekwencji."
                action={
                  <Link to="/habits" className="text-sm font-bold text-[var(--color-accent)] hover:underline">
                    Zobacz więcej
                  </Link>
                }
              >
                <div className="space-y-3">
                  {habits.slice(0, 4).map((habit) => {
                    const done = Boolean(habit.completions?.[todayKey]);
                    return (
                      <div
                        key={habit.id}
                        className="flex items-center gap-3 rounded-[1.2rem] bg-[rgba(242,169,59,0.08)] px-4 py-3"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-white text-lg">
                          {habit.emoji || '⚡'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[var(--color-ink)]">{habit.name}</p>
                          <p className="text-xs text-[var(--color-ink-soft)]">Seria: {habit.streak || 0} dni</p>
                        </div>
                        <span
                          className={cn(
                            'rounded-full px-3 py-1 text-xs font-bold',
                            done
                              ? 'bg-[rgba(47,158,103,0.12)] text-[var(--color-success)]'
                              : 'bg-white/80 text-[var(--color-muted)]',
                          )}
                        >
                          {done ? 'Gotowe' : 'Czeka'}
                        </span>
                      </div>
                    );
                  })}
                  {habits.length === 0 ? (
                    <p className="text-sm text-[var(--color-ink-soft)]">Dodaj pierwszy nawyk, aby zacząć budować serię.</p>
                  ) : null}
                </div>
              </Panel>

              <Panel
                title="Puls tygodnia"
                description="Jak wygląda tempo wykonywania zadań."
              >
                <div className="flex items-end gap-2">
                  {weekDays.map((day) => (
                    <div key={day.key} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-28 w-full items-end rounded-[1rem] bg-[rgba(32,26,23,0.05)] p-1">
                        <div
                          className={cn(
                            'w-full rounded-[0.8rem] transition-all duration-500',
                            day.isToday ? 'bg-[linear-gradient(180deg,var(--color-accent),var(--color-accent-strong))]' : 'bg-[rgba(40,148,156,0.72)]',
                          )}
                          style={{
                            height: `${Math.max(8, (day.value / maxWeekValue) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className={cn('text-xs font-bold', day.isToday ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]')}>
                        {day.shortLabel}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-[1.2rem] bg-[rgba(40,148,156,0.08)] px-4 py-3 text-sm text-[var(--color-ink-soft)]">
                  {weekStats?.progressPercentage ?? 0}% tygodniowego planu domknięte.
                </div>
              </Panel>
            </div>
          </div>

          <div className="space-y-4">
            <Panel
              title="Agenda"
              description="Najbliższe wydarzenia i plan dnia."
              action={
                <Link to="/calendar" className="text-sm font-bold text-[var(--color-accent)] hover:underline">
                  Otwórz kalendarz
                </Link>
              }
            >
              <div className="space-y-3">
                {nextEvents.length > 0 ? (
                  nextEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 rounded-[1.2rem] border border-[var(--color-line)] bg-white/75 px-4 py-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-[rgba(40,148,156,0.1)] text-[var(--color-calm)]">
                        <CalendarClock size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[var(--color-ink)]">{event.title}</p>
                        <p className="text-xs text-[var(--color-ink-soft)]">
                          {event.date}
                          {event.time ? `, ${event.time}` : ''}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--color-ink-soft)]">Brak nadchodzących wydarzeń. To dobry moment na zaplanowanie tygodnia.</p>
                )}
              </div>
            </Panel>

            <Panel title="Finanse i notatki" description="Szybki stan zasobów.">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.3rem] bg-[rgba(40,148,156,0.08)] p-4">
                  <div className="flex items-center gap-2 text-[var(--color-calm)]">
                    <PiggyBank size={18} />
                    <span className="text-overline">Budżet</span>
                  </div>
                  <p className="mt-3 font-display text-3xl font-bold tracking-[-0.06em] text-[var(--color-ink)]">
                    {budgetAnalytics.balance.toFixed(0)} zł
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                    Wydatki: {budgetAnalytics.totalExpenses.toFixed(0)} zł
                  </p>
                </div>
                <div className="rounded-[1.3rem] bg-[rgba(239,99,81,0.08)] p-4">
                  <div className="flex items-center gap-2 text-[var(--color-accent)]">
                    <NotebookPen size={18} />
                    <span className="text-overline">Notatki</span>
                  </div>
                  <p className="mt-3 font-display text-3xl font-bold tracking-[-0.06em] text-[var(--color-ink)]">
                    {notesCount}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                    Aktywnych szkiców i zapisów
                  </p>
                </div>
              </div>
            </Panel>

            <Panel
              title="Wiadomości"
              description="Szybki kontakt bez wychodzenia z panelu."
              action={
                <Link to="/chat" className="text-sm font-bold text-[var(--color-accent)] hover:underline">
                  Otwórz chat
                </Link>
              }
            >
              <div className="space-y-3">
                {messagePreview.length > 0 ? (
                  messagePreview.map((message) => (
                    <div
                      key={message.id}
                      className="rounded-[1.2rem] border border-[var(--color-line)] bg-white/74 px-4 py-3"
                    >
                      <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                        <MessageSquareText size={14} />
                        <span>{message.sender}</span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--color-ink)]">{message.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--color-ink-soft)]">Brak wiadomości. Zacznij rozmowę, gdy tylko będziesz chciał coś ustalić.</p>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void sendCurrentMessage();
                    }
                  }}
                  placeholder="Napisz krótką wiadomość..."
                  className="input-base flex-1"
                />
                <button
                  type="button"
                  onClick={() => void sendCurrentMessage()}
                  disabled={!newMessage.trim()}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,var(--color-accent),var(--color-accent-strong))] text-white shadow-[0_16px_30px_rgba(239,99,81,0.2)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Send size={16} />
                </button>
              </div>
            </Panel>
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="Podsumowanie dnia" description="Najważniejsze liczby w jednym miejscu.">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Ukończone dziś', value: String(completedToday), icon: TrendingUp },
              { label: 'Wydarzenia dziś', value: String(todayEvents.length), icon: Clock3 },
              { label: 'Cele w toku', value: String(goalsInProgress), icon: Target },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.2rem] bg-white/74 px-4 py-4">
                <item.icon size={18} className="text-[var(--color-accent)]" />
                <p className="mt-3 font-display text-3xl font-bold tracking-[-0.06em] text-[var(--color-ink)]">
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{item.label}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}
