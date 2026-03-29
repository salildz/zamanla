import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { COMMON_TIMEZONES, formatTimezoneOffset } from '../../utils/timezoneUtils.js'

export default function TimezoneCombobox({ value, onChange, error, label, required }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const selectedTz = COMMON_TIMEZONES.find((tz) => tz.value === value)

  const filtered = query.trim()
    ? COMMON_TIMEZONES.filter(
        (tz) =>
          tz.label.toLowerCase().includes(query.toLowerCase()) ||
          tz.value.toLowerCase().includes(query.toLowerCase())
      )
    : COMMON_TIMEZONES

  const open = () => {
    setIsOpen(true)
    setQuery('')
    setActiveIndex(-1)
  }

  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setActiveIndex(-1)
  }, [])

  const select = useCallback(
    (tz) => {
      onChange(tz.value)
      close()
    },
    [onChange, close]
  )

  // Click/touch outside to close
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        close()
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchend', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchend', handler)
    }
  }, [close])

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-option]')
      items[activeIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  const handleTriggerKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open()
    }
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && filtered[activeIndex]) {
        select(filtered[activeIndex])
      }
    } else if (e.key === 'Escape') {
      close()
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleTriggerKeyDown}
        className={clsx(
          'w-full flex items-center gap-2 rounded-md border bg-white text-sm px-3 py-2.5 text-left transition-colors focus:outline-none focus:ring-2',
          error ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-indigo-500'
        )}
      >
        {/* Globe icon */}
        <svg
          className="w-4 h-4 text-gray-400 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
          />
        </svg>

        <span className={clsx('flex-1 truncate', !selectedTz && 'text-gray-400')}>
          {selectedTz ? selectedTz.label : t('create.timezoneSearch')}
        </span>

        {selectedTz && (
          <span className="shrink-0 text-xs text-gray-400 font-mono">
            {formatTimezoneOffset(value)}
          </span>
        )}

        {/* Chevron */}
        <svg
          className={clsx(
            'w-4 h-4 text-gray-400 shrink-0 transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveIndex(-1)
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={t('create.timezoneSearch')}
              className="w-full text-sm px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
            />
          </div>

          {/* Options list */}
          <ul ref={listRef} className="overflow-y-auto max-h-56 py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-gray-400">
                {t('create.timezoneNoResults')}
              </li>
            ) : (
              filtered.map((tz, i) => (
                <li
                  key={tz.value}
                  data-option
                  onMouseDown={(e) => {
                    // mousedown fires before blur — prevent input blur from closing dropdown
                    e.preventDefault()
                    select(tz)
                  }}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2.5 cursor-pointer text-sm',
                    i === activeIndex
                      ? 'bg-indigo-50 text-indigo-900'
                      : 'text-gray-700 hover:bg-gray-50',
                    tz.value === value && 'font-medium'
                  )}
                >
                  <span className="flex-1 truncate">{tz.label}</span>
                  <span className="shrink-0 text-xs text-gray-400 font-mono">
                    {formatTimezoneOffset(tz.value)}
                  </span>
                  {tz.value === value && (
                    <svg
                      className="w-4 h-4 text-indigo-600 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
