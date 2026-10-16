'use client';
import { cn } from '@/lib/utils';
import { motion, Transition } from 'motion/react';

export type BorderTrailProps = {
  className?: string;
  size?: number;
  transition?: Transition;
  onAnimationComplete?: () => void;
  style?: React.CSSProperties;
};

export function BorderTrail({
  className,
  size = 5,
  transition,
  onAnimationComplete,
  style,
}: BorderTrailProps) {
  const defaultTransition: Transition = {
    repeat: Infinity,
    duration: 3.2,
    ease: 'linear',
  };

  return (
    // Madison: no mask, no soft trail. A single square travels the frame edge.
    <div className='pointer-events-none absolute inset-0'>
      <motion.div
        className={cn('absolute aspect-square bg-ink', className)}
        style={{
          width: size,
          offsetPath: 'rect(0 auto auto 0)',
          ...style,
        }}
        animate={{
          offsetDistance: ['0%', '100%'],
        }}
        transition={transition || defaultTransition}
        onAnimationComplete={onAnimationComplete}
      />
    </div>
  );
}
