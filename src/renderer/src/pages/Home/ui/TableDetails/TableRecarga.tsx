import { Table, TableBody, TableHeader } from '@/components/ui/table'

export const TableRecarga = ({ details }: { details: Email['content'] }) => {
  if (details.type !== 'recarga') throw new Error('Not a recarga')
  return (
    <Table>
      <TableHeader></TableHeader>
      <TableBody></TableBody>
    </Table>
  )
}
