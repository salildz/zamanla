import clsx from 'clsx'

const variants = {
  default: 'bg-gray-100 text-gray-700 border border-gray-300',
  primary: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  success: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
  warning: 'bg-amber-100 text-amber-700 border border-amber-300',
  danger: 'bg-red-100 text-red-700 border border-red-300',
  teal: 'bg-teal-100 text-teal-700 border border-teal-300',
  purple: 'bg-purple-100 text-purple-700 border border-purple-300',
}

const sizes = {
  sm: 'text-xs px-2 py-0.5 rounded',
  md: 'text-xs px-2.5 py-1 rounded-md',
  lg: 'text-sm px-3 py-1 rounded-md',
}

export default function Badge({ children, variant = 'default', size = 'md', className, dot }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span
          className={clsx('w-1.5 h-1.5 rounded-full', {
            'bg-gray-500': variant === 'default',
            'bg-indigo-500': variant === 'primary',
            'bg-emerald-500': variant === 'success',
            'bg-amber-500': variant === 'warning',
            'bg-red-500': variant === 'danger',
            'bg-teal-500': variant === 'teal',
            'bg-purple-500': variant === 'purple',
          })}
        />
      )}
      {children}
    </span>
  )
}
