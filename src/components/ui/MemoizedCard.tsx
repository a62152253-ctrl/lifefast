import { memo, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface MemoizedCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  tap?: boolean;
}

export const MemoizedCard = memo<MemoizedCardProps>(({
  children,
  className,
  onClick,
  hover = true,
  tap = true,
}) => {
  if (!hover && !tap) {
    return (
      <div
        className={cn(
          'rounded-[1.6rem] border border-[var(--color-line)] bg-white/90 shadow-[0_18px_40px_rgba(48,42,36,0.08)]',
          className,
        )}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      whileHover={hover ? { y: -3, scale: 1.01 } : undefined}
      whileTap={tap ? { scale: 0.985 } : undefined}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'rounded-[1.6rem] border border-[var(--color-line)] bg-white/90 shadow-[0_18px_40px_rgba(48,42,36,0.08)]',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
});

MemoizedCard.displayName = 'MemoizedCard';
