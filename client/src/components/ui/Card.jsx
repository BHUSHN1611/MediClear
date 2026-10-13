import { clsx } from 'clsx'

/**
 * Card primitives.
 * Usage: <Card>, <Card.Body>, <Card.Header>, <Card.Footer>
 */
function Card({ className, children, interactive = false, ...props }) {
  return (
    <div
      className={clsx(
        'bg-white rounded-2xl border border-surface-100',
        interactive
          ? 'shadow-card transition-all duration-200 hover:shadow-card-md hover:-translate-y-0.5 cursor-pointer'
          : 'shadow-card',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function CardHeader({ className, children, ...props }) {
  return (
    <div
      className={clsx('px-6 py-4 border-b border-surface-100', className)}
      {...props}
    >
      {children}
    </div>
  )
}

function CardBody({ className, children, ...props }) {
  return (
    <div className={clsx('px-6 py-5', className)} {...props}>
      {children}
    </div>
  )
}

function CardFooter({ className, children, ...props }) {
  return (
    <div
      className={clsx('px-6 py-4 border-t border-surface-100 bg-surface-50 rounded-b-2xl', className)}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Header = CardHeader
Card.Body   = CardBody
Card.Footer = CardFooter

export default Card
