import { Table, TableBody, TableCell, TableHeader, TableRow } from './components/ui/table'

const RideSelectionCard: React.FC<{ from?: Destination; to?: Destination }> = ({ from, to }) => {
  return (
    <div className="bg-black bg-opacity-80 text-white p-4 rounded-xl shadow-lg min-w-150 relative min-h-32">
      {/* PICK UP */}
      {from && (
        <div className="flex items-start gap-3 z-10 absolute">
          <span className="w-3 h-3 bg-purple-500 rounded-full mt-1.5"></span>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Pick Up</span>
            <span className="text-lg font-semibold">{from?.rua}</span>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="border-l-2 border-dashed border-gray-500  left-[21px] top-6 h-12 absolute z-0"></div>

      {/* DROP OFF */}
      {to && (
        <div className="flex items-start gap-3 z-10 absolute top-16">
          <span className="w-3 h-3 bg-green-500 rounded-full mt-1.5"></span>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Drop Off</span>
            <span className="text-lg font-semibold text-gray-300">{to?.rua}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default RideSelectionCard

const TableViagem = ({ details }: { details: Email['content'] }) => {
  if (details.type !== 'viagem') throw new Error('Not a viagem')
  return (
    <div>
      <div className="grid grid-cols-[auto_1fr_auto] gap-4 justify-center items-center">
        <RideSelectionCard from={details.pickup} to={details.dropoff} />
      </div>
    </div>
  )
}
const TableCancelada = ({ details }: { details: Email['content'] }) => {
  if (details.type !== 'cancelada') throw new Error('Not a cancelada')
  return (
    <Table>
      <TableHeader></TableHeader>
      <TableBody></TableBody>
    </Table>
  )
}
const TableRecarga = ({ details }: { details: Email['content'] }) => {
  if (details.type !== 'recarga') throw new Error('Not a recarga')
  return (
    <Table>
      <TableHeader></TableHeader>
      <TableBody></TableBody>
    </Table>
  )
}

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
