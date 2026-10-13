import { forwardRef } from 'react'
import { clsx } from 'clsx'

/**
 * MediClear Button primitive.
 * Variants: primary | secondary | teal | ghost | danger
 * Sizes: sm | md (default) | lg
 */
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    className,
    disabled,
    loading = false,
    children,
    ...props
  },
  ref
) {
  const variantClass = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    teal:      'btn-teal',
    ghost:     'btn-ghost',
    danger:    'btn-danger',
  }[variant]

  const sizeClass = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  }[size]

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx('btn', variantClass, sizeClass, className)}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  )
})

export default Button
