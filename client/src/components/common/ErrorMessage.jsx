import clsx from 'clsx'
import Button from './Button.jsx'

export default function ErrorMessage({ title, message, onRetry, className }) {
  return (
    <div
      className={clsx(
        'rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3',
        className
      )}
      role="alert"
    >
      <div className="shrink-0 mt-0.5">
        <svg
          className="w-5 h-5 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold text-red-800">{title}</p>}
        {message && <p className="text-sm text-red-700 mt-0.5">{message}</p>}
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-red-700 hover:bg-red-100"
            onClick={onRetry}
          >
            Try again
          </Button>
        )}
      </div>
    </div>
  )
}

export function PageError({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full">
        <ErrorMessage title={title} message={message} onRetry={onRetry} />
      </div>
    </div>
  )
}

export function InlineError({ message, onRetry }) {
  return (
    <div className="py-8 flex justify-center">
      <ErrorMessage
        message={message || 'Failed to load data.'}
        onRetry={onRetry}
        className="max-w-md w-full"
      />
    </div>
  )
}
