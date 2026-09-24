import { cn } from '@/lib/utils'
import { ReceiptText } from 'lucide-react'

/** Nome provisório do app (decisão em aberto no design, §5). Trocar aqui troca em todo lugar. */
export const APP_NAME = 'Recibos de corrida'

interface BrandProps {
  size?: 'md' | 'sm'
  className?: string
}

export function Brand({ size = 'md', className }: BrandProps) {
  return (
    <div className={cn('flex items-center gap-2.5 text-foreground', className)}>
      <ReceiptText aria-hidden strokeWidth={1.75} className={size === 'md' ? 'size-6' : 'size-5'} />
      <span className={cn('font-medium', size === 'md' ? 'text-lg' : 'text-base')}>{APP_NAME}</span>
    </div>
  )
}
