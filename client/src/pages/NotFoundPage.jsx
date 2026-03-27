import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/common/Button.jsx'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15 15" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg">Zamanla</span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-sm w-full">
          {/* 404 illustration */}
          <div className="relative mb-8">
            <div className="text-8xl font-extrabold text-gray-100 select-none">404</div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-indigo-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
          <p className="text-gray-500 mb-8">
            The page you're looking for doesn't exist or may have been moved.
            If you were trying to open a session link, please double-check the URL.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="primary" size="md" onClick={() => navigate(-1)}>
              Go back
            </Button>
            <Link to="/">
              <Button variant="secondary" size="md">
                Home
              </Button>
            </Link>
            <Link to="/create">
              <Button variant="ghost" size="md">
                Create a session
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-6 text-center text-sm text-gray-400">
        Need help? Make sure you have the correct link.
      </div>
    </div>
  )
}
