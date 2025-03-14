import { Table, TableBody, TableHeader } from '@/components/ui/table'

export const TableCancelada = ({ details }: { details: Email['content'] }) => {
  if (details.type !== 'cancelada') throw new Error('Not a cancelada')
  return (
    <Table>
      <TableHeader></TableHeader>
      <TableBody></TableBody>
    </Table>
  )
}
