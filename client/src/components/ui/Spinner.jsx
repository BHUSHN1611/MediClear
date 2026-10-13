import { clsx } from 'clsx'

/**
 * Spinner — accessible loading indicator.
 * Sizes: sm | md | lg
 */
export default function Spinner({ size = 'md', className, label = 'Loading…' }) {
  const sizeClass = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }[size]

  return (
    <svg
      className={clsx('animate-spin text-primary-600', sizeClass, className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label={label}
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
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
      />
    </svg>
  )
}

/**
 * Skeleton loading placeholder.
 */
export function Skeleton({ className }) {
  return <div className={clsx('skeleton', className)} aria-hidden="true" />
}
