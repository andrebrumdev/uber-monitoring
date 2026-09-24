import { formatToBRL } from 'brazilian-values'
import { Star } from 'lucide-react'
import { DetailItem, DetailLayout, DetailList, DetailSection, PaymentMethod } from './Card'

const decimal = (value?: string | number): string => String(value ?? '').replace('.', ',')

function Stop({ label, stop, last }: { label: string; stop: Destination; last?: boolean }) {
  if (!stop) return null
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last && (
        <span aria-hidden className="absolute top-3.5 bottom-0 left-[4.5px] w-px bg-border" />
      )}
      <span
        aria-hidden
        className={
          last
            ? 'mt-1.5 size-2.5 shrink-0 rounded-full bg-foreground'
            : 'mt-1.5 size-2.5 shrink-0 rounded-full border-2 border-muted-foreground'
        }
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-4 text-[13px] text-muted-foreground">
          <span>{label}</span>
          {stop.time && <span>{stop.time}</span>}
        </div>
        <span className="text-[15px] font-medium text-foreground">
          {stop.rua || 'Endereço não informado'}
        </span>
        {stop.bairro && <span className="text-[13px] text-muted-foreground">{stop.bairro}</span>}
      </div>
    </li>
  )
}

export const TableViagem = ({ details }: { details: Email['content'] }) => {
  if (details.type !== 'viagem') throw new Error('Not a viagem')
  const duration = details.duration?.trim()
  const hasRoute = Boolean(details.pickup || details.dropoff)

  return (
    <DetailLayout html={details.content}>
      <DetailSection title="Trajeto">
        {hasRoute ? (
          <ol className="flex flex-col">
            {details.pickup && <Stop label="De" stop={details.pickup} last={!details.dropoff} />}
            {details.dropoff && <Stop label="Para" stop={details.dropoff} last />}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">O recibo não trouxe o trajeto.</p>
        )}
      </DetailSection>

      <DetailSection title="Corrida">
        <DetailList>
          <DetailItem label="Motorista">
            <span className="inline-flex items-center gap-2">
              {details.driver || 'Não informado'}
              {Boolean(details.rating) && (
                <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                  <Star aria-hidden className="size-3 fill-current" />
                  <span className="sr-only">Avaliação </span>
                  {decimal(details.rating)}
                </span>
              )}
            </span>
          </DetailItem>
          {details.distance && (
            <DetailItem label="Distância">{decimal(details.distance)} km</DetailItem>
          )}
          {duration && duration !== 'min' && <DetailItem label="Duração">{duration}</DetailItem>}
          <DetailItem label="Pagamento">
            <PaymentMethod type={details.paymentMethod} />
          </DetailItem>
        </DetailList>
      </DetailSection>

      <DetailSection title="Valores">
        <DetailList>
          <DetailItem label="Subtotal">{formatToBRL(details.subtotal ?? 0)}</DetailItem>
          <DetailItem label="Custo fixo">{formatToBRL(details.fixedCost ?? 0)}</DetailItem>
          {Boolean(details.tip) && (
            <DetailItem label="Gorjeta">{formatToBRL(details.tip ?? 0)}</DetailItem>
          )}
          {Boolean(details.credit) && (
            <DetailItem label="Crédito Uber One">− {formatToBRL(details.credit ?? 0)}</DetailItem>
          )}
          <DetailItem label="Total" emphasis>
            {formatToBRL(details.total ?? 0)}
          </DetailItem>
        </DetailList>
      </DetailSection>
    </DetailLayout>
  )
}
