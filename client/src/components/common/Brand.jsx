import clsx from 'clsx'

const markSizes = {
  sm: 'w-7 h-7 rounded-lg',
  md: 'w-9 h-9 rounded-xl',
  lg: 'w-11 h-11 rounded-2xl',
}

const wordSizes = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
}

/**
 * Shared Zamanla brand lockup — a clay clock tile + Fraunces wordmark.
 * Render inside a <Link> where navigation is needed.
 */
export default function Brand({ size = 'md', wordmark = true, className }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5 select-none', className)}>
      <span
        className={clsx(
          'inline-flex items-center justify-center bg-forest-500 text-white shrink-0',
          'shadow-[0_6px_14px_-6px_rgba(38,64,53,0.7)] ring-1 ring-forest-600/40',
          markSizes[size]
        )}
        aria-hidden="true"
      >
        <svg
          className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 12V7.5M12 12l3.5 2" />
        </svg>
      </span>
      {wordmark && (
        <span
          className={clsx(
            'font-display font-semibold tracking-tight text-sand-900',
            wordSizes[size]
          )}
        >
          Zamanla
        </span>
      )}
    </span>
  )
}
