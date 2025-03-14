import { TableCancelada } from './TableCancelada'
import { TableRecarga } from './TableRecarga'
import { TableViagem } from './TableViagem'

export const TableDetails = ({ details }: { details: Email['content'] }) => {
  switch (details.type) {
    case 'viagem':
      return <TableViagem details={details} />
    case 'cancelada':
      return <TableCancelada details={details} />
    case 'recarga':
      return <TableRecarga details={details} />
    default:
      return null
  }
}
