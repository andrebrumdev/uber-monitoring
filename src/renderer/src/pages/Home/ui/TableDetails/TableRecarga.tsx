import { formatToBRL } from 'brazilian-values'
import { DetailItem, DetailLayout, DetailList, DetailSection } from './Card'

export const TableRecarga = ({ details }: { details: Email['content'] }) => {
  if (details.type !== 'recarga') throw new Error('Not a recarga')
  return (
    <DetailLayout html={details.content}>
      <DetailSection title="Recarga de Uber Cash">
        <DetailList>
          <DetailItem label="Valor adicionado">{formatToBRL(details.total ?? 0)}</DetailItem>
        </DetailList>
      </DetailSection>
    </DetailLayout>
  )
}
