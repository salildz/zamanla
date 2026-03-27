import clsx from 'clsx'

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
  xl: 'h-16 w-16 border-4',
}

export default function LoadingSpinner({ size = 'md', className, label = 'Loading...' }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3', className)} role="status">
      <div
        className={clsx(
          'animate-spin rounded-full border-t-indigo-600 border-indigo-200',
          sizes[size]
        )}
        style={{ borderStyle: 'solid' }}
      />
      {label && <span className="sr-only">{label}</span>}
    </div>
  )
}

export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
      <LoadingSpinner size="lg" />
      {message && <p className="text-gray-500 text-sm">{message}</p>}
    </div>
  )
}

export function InlineLoader({ message }) {
  return (
    <div className="flex items-center justify-center py-12 gap-3">
      <LoadingSpinner size="md" />
      {message && <span className="text-gray-500 text-sm">{message}</span>}
    </div>
  )
}
