import { Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { clsx } from 'clsx'

const CONFIG = {
  info:    { cls: 'alert-info',    Icon: Info },
  success: { cls: 'alert-success', Icon: CheckCircle },
  warning: { cls: 'alert-warning', Icon: AlertTriangle },
  danger:  { cls: 'alert-danger',  Icon: XCircle },
}

export default function Alert({ variant = 'info', title, children, className, ...props }) {
  const { cls, Icon } = CONFIG[variant] || CONFIG.info

  return (
    <div role="alert" className={clsx(cls, className)} {...props}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  )
}
