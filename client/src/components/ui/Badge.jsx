import { clsx } from 'clsx'

const VARIANTS = {
  blue:   'badge-blue',
  teal:   'badge-teal',
  green:  'badge-green',
  yellow: 'badge-yellow',
  red:    'badge-red',
  gray:   'badge-gray',
}

export default function Badge({ variant = 'gray', className, children, ...props }) {
  return (
    <span className={clsx(VARIANTS[variant] || 'badge-gray', className)} {...props}>
      {children}
    </span>
  )
}
