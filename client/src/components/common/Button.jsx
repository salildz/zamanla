import clsx from 'clsx'

const variants = {
  primary: 'bg-indigo-600 text-white border border-indigo-300 hover:bg-indigo-700 active:bg-indigo-800 focus-visible:ring-indigo-500 disabled:opacity-60',
  secondary: 'bg-gray-100 text-gray-100 border border-gray-300 hover:bg-gray-200 active:bg-gray-300 focus-visible:ring-gray-400 disabled:opacity-60',
  danger: 'bg-red-600 text-white border border-red-500 hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500 disabled:opacity-60',
  ghost: 'bg-transparent text-gray-300 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-400 disabled:text-gray-400',
  success: 'bg-emerald-600 text-white border border-emerald-500 hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500 disabled:opacity-60',
}

const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded',
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2 text-sm rounded-md',
  lg: 'px-5 py-2.5 text-base rounded-lg',
  xl: 'px-6 py-3 text-base rounded-lg',
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
        'inline-flex items-center justify-center gap-2 font-medium transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed backdrop-blur-sm',
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
