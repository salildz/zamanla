import clsx from 'clsx'

const variants = {
  primary: 'bg-clay-500 text-white border border-clay-600 hover:bg-clay-600 active:bg-clay-700 focus-visible:ring-clay-400 disabled:opacity-60',
  secondary: 'bg-sand-50 text-sand-800 border border-sand-300 hover:bg-sand-100 active:bg-sand-200 focus-visible:ring-clay-400 disabled:opacity-60',
  danger: 'bg-brick-500 text-white border border-brick-600 hover:bg-brick-600 active:bg-brick-700 focus-visible:ring-brick-500 disabled:opacity-60',
  ghost: 'bg-transparent text-sand-700 hover:bg-sand-200 active:bg-sand-300 focus-visible:ring-clay-400 disabled:text-sand-400',
  success: 'bg-pine-600 text-white border border-pine-700 hover:bg-pine-700 active:bg-pine-800 focus-visible:ring-pine-500 disabled:opacity-60',
}

const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-lg',
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-base rounded-xl',
  xl: 'px-6 py-3.5 text-base rounded-xl',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  loading = false,
  disabled = false,
  type = 'button',
  fullWidth = false,
  leftIcon,
  rightIcon,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>{typeof loading === 'string' ? loading : children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  )
}
