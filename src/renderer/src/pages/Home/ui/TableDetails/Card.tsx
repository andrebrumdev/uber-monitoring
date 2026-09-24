import { EmailPreview } from '@/components/EmailPreview'
import { cn } from '@/lib/utils'
import { CreditCard, Mail } from 'lucide-react'
import type React from 'react'

/** Peças comuns aos detalhes de viagem, recarga e cancelada: mesma grade, mesmos pares rótulo/valor. */

export function DetailLayout({ html, children }: { html: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-x-10 gap-y-6 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {children}
      </div>
      <OriginalEmailLink html={html} />
    </div>
  )
}

export function DetailSection({
  title,
  className,
  children
}: {
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-3', className)}>
      <h3 className="text-[13px] font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

export function DetailList({ children }: { children: React.ReactNode }) {
  return <dl className="flex flex-col text-sm">{children}</dl>
}

export function DetailItem({
  label,
  children,
  emphasis = false
}: {
  label: string
  children: React.ReactNode
  emphasis?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 py-1',
        emphasis && 'mt-1 border-t border-border pt-2'
      )}
    >
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('text-right text-foreground', emphasis && 'font-medium')}>{children}</dd>
    </div>
  )
}

const PAYMENT_NAMES: Record<string, string> = {
  amex: 'Amex',
  jcb: 'JCB',
  pix: 'Pix',
  desconhecido: 'Não informado'
}

export function PaymentMethod({ type }: { type?: string }) {
  if (!type) return <>Não informado</>
  const key = type.toLowerCase()
  const name = PAYMENT_NAMES[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
  return (
    <span className="inline-flex items-center gap-1.5">
      <CreditCard aria-hidden className="size-3.5 text-muted-foreground" />
      {name}
    </span>
  )
}

function OriginalEmailLink({ html }: { html: string }) {
  return (
    <EmailPreview
      html={html}
      trigger={
        <button
          type="button"
          className="-mx-1 inline-flex w-fit items-center gap-1.5 rounded-control px-1 text-sm text-muted-foreground underline-offset-4 outline-none transition-colors duration-300 ease-out-quart hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          <Mail aria-hidden className="size-3.5" />
          Ver e-mail original
        </button>
      }
    />
  )
}
