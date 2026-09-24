import { formatToBRL } from 'brazilian-values'
import { DetailItem, DetailLayout, DetailList, DetailSection, PaymentMethod } from './Card'

/** Estorno com sinal de menos tipográfico, como o crédito em TableViagem. */
const signedBRL = (value: number): string =>
  value < 0 ? `− ${formatToBRL(Math.abs(value))}` : formatToBRL(value)

/** "9/3/2024 14:37" → "9/3, 14:37" (o ano já está na linha do recibo). */
const shortDate = (date?: string): string | undefined => {
  if (!date) return undefined
  const match = /^(\d{1,2}\/\d{1,2})\/\d{4}(?:\s+(\d{1,2}:\d{2}))?$/.exec(date)
  if (!match) return date
  return match[2] ? `${match[1]}, ${match[2]}` : match[1]
}

function Payments({ payments }: { payments: CanceledPayment[] }) {
  return (
    <ul className="flex flex-col text-sm">
      {payments.map((payment, index) => (
        <li key={index} className="flex items-center justify-between gap-4 py-1">
          <span className="flex min-w-0 flex-col">
            <span className="text-foreground">
              <PaymentMethod type={payment.method} />
            </span>
            <span className="text-[13px] text-muted-foreground">
              {[payment.refund ? 'Reembolso' : 'Cobrança', shortDate(payment.date)]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>
          <span className="text-foreground">{signedBRL(payment.amount)}</span>
        </li>
      ))}
    </ul>
  )
}

export const TableCancelada = ({ details }: { details: Email['content'] }) => {
  if (details.type !== 'cancelada') throw new Error('Not a cancelada')
  const payments = details.payments ?? []
  const total = details.total ?? 0
  const refunded = total === 0 && payments.some((payment) => payment.refund)
  const breakdown: [string, number | undefined][] = [
    ['Tempo', details.time],
    ['Distância', details.distance],
    ['Taxa de conveniência', details.convenienceFee],
    ['Subtotal', details.subtotal]
  ]

  return (
    <DetailLayout html={details.content}>
      <DetailSection title="Corrida cancelada">
        <DetailList>
          {details.product && <DetailItem label="Categoria">{details.product}</DetailItem>}
          <DetailItem label="Pagamento">
            <PaymentMethod type={details.paymentMethod} />
          </DetailItem>
        </DetailList>
      </DetailSection>

      <DetailSection title="Pagamentos">
        {payments.length > 0 ? (
          <Payments payments={payments} />
        ) : (
          <p className="text-sm text-muted-foreground">O recibo não trouxe os pagamentos.</p>
        )}
      </DetailSection>

      <DetailSection title="Valores">
        <DetailList>
          {breakdown.map(([label, value]) =>
            value === undefined ? null : (
              <DetailItem key={label} label={label}>
                {formatToBRL(value)}
              </DetailItem>
            )
          )}
          <DetailItem label="Total" emphasis>
            <span className="inline-flex items-baseline gap-2">
              {refunded && (
                <span className="text-[13px] font-normal text-muted-foreground">Estornado</span>
              )}
              {formatToBRL(total)}
            </span>
          </DetailItem>
        </DetailList>
      </DetailSection>
    </DetailLayout>
  )
}
