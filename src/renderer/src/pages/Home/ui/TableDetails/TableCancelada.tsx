import { formatToBRL } from 'brazilian-values'
import { DetailItem, DetailLayout, DetailList, DetailSection, PaymentMethod } from './Card'

export const TableCancelada = ({ details }: { details: Email['content'] }) => {
  if (details.type !== 'cancelada') throw new Error('Not a cancelada')
  return (
    <DetailLayout html={details.content}>
      <DetailSection title="Corrida cancelada">
        <DetailList>
          <DetailItem label="Pagamento">
            <PaymentMethod type={details.paymentMethod} />
          </DetailItem>
        </DetailList>
      </DetailSection>
      <DetailSection title="Valores" className="md:col-start-3">
        <DetailList>
          <DetailItem label="Subtotal">{formatToBRL(details.subtotal ?? 0)}</DetailItem>
          <DetailItem label="Custo fixo">{formatToBRL(details.fixedCost ?? 0)}</DetailItem>
          <DetailItem label="Total" emphasis>
            {formatToBRL(details.total ?? 0)}
          </DetailItem>
        </DetailList>
      </DetailSection>
    </DetailLayout>
  )
}
