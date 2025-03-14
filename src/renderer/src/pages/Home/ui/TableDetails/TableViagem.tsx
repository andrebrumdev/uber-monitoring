import { formatToBRL } from 'brazilian-values'
import { motion } from 'framer-motion'
import { MiniCard } from './Card'

const RideSelectionCard: React.FC<{ from?: Destination; to?: Destination }> = ({ from, to }) => {
  return (
    <div
      className="  
     flex flex-col gap-4 relative min-w-150 min-h-32
     "
    >
      <motion.svg className="absolute top-6 left-0 w-0.5 -translate-x-1/2 h-12">
        <motion.line
          x1="1"
          y1="0"
          x2="1"
          y2="48" // Linha vertical
          stroke="gray"
          strokeWidth="2"
          strokeDasharray="6 6" // Define o traço (6px linha, 6px espaço)
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: -12 }} // Faz o traço se mover para cima
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} // Animação contínua
        />
      </motion.svg>
      <div className="flex flex-col *:py-2 divide-accent/50 divide-y pl-4">
        {/* PICK UP */}
        {from && (
          <div className="flex items-start gap-3 relative">
            <span className="w-3 h-3 bg-primary border-2 border-green-500 rounded-full mt-1.5 absolute -translate-x-1/2 -left-4" />
            <div className="flex flex-col w-full">
              <div className="flex justify-between">
                <span className="text-xs text-secondary/80 uppercase tracking-wide">de</span>
                <span className="text-xs text-secondary/80 uppercase tracking-wide">
                  {from.time}
                </span>
              </div>
              <span className="text-lg font-semibold">{from?.rua}</span>
            </div>
          </div>
        )}
        {/* DROP OFF */}
        {to && (
          <div className="flex items-start gap-3 relative">
            <span className="w-3 h-3 bg-primary border-2 border-red-500 rounded-full mt-1.5 absolute -translate-x-1/2 -left-4" />
            <div className="flex flex-col w-full">
              <div className="flex justify-between">
                <span className="text-xs text-secondary/80 uppercase tracking-wide">Para</span>
                <span className="text-xs text-secondary/80 uppercase tracking-wide">{to.time}</span>
              </div>
              <span className="text-lg font-semibold ">{to?.rua}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const TableViagem = ({ details }: { details: Email['content'] }) => {
  if (details.type !== 'viagem') throw new Error('Not a viagem')
  return (
    <div className="bg-primary bg-opacity-80 rounded-xl shadow-lg text-primary-foreground p-4 flex flex-col gap-2">
      <RideSelectionCard from={details.pickup} to={details.dropoff} />
      <div className="flex justify-between text-lg items-baseline ">
        <div className="flex flex-col gap-0.5">
          <div className="flex gap-2 items-center">
            <span>
              <b>Motorista:</b> {details.driver}
            </span>
            <motion.div className="flex  items-center gap-0.5 text-xs text-gray-400">
              <motion.div
                initial={{ opacity: 0, scale: 0 }} // Começa invisível e deslocado para cima
                animate={{ opacity: 1, scale: 1 }} // Aparece suavemente e desliza para baixo
                transition={{ duration: 0.5, ease: 'backOut' }} // Suaviza a animação
              >
                ⭐
              </motion.div>
              {details.rating}
            </motion.div>
          </div>
          <span className="text-sm text-gray-400">Distância: {details.distance} km</span>
          <span className="text-sm text-gray-400">Duração: {details.duration}</span>
          {/* ver email */}
          <a
            onClick={() => {
              const childWindow = window.open('', 'modal')
              if (!childWindow) return
              childWindow.document.writeln(details.content)
            }}
            className="text-sm text-gray-400 underline hover:text-gray-300 cursor-pointer"
          >
            Ver email
          </a>
        </div>

        <div className="flex flex-col gap-0.5 items-end">
          <MiniCard type={details.paymentMethod} />
          <div className="flex flex-col gap-0.5 items-end divide-accent/50 divide-y divide-dashed">
            <div className="flex flex-col items-end text-sm pl-4 pb-1">
              <span>
                <b>Subtotal:</b> {formatToBRL(details.subtotal ?? 0)}
              </span>
              <span>
                <b>Custo fixo:</b> {formatToBRL(details.fixedCost ?? 0)}
              </span>
              <span>
                <b>Gorgeta:</b> {formatToBRL(details.tip ?? 0)}
              </span>
              <span>
                <b>Uber One:</b> {formatToBRL(-(details.credit ?? 0))}
              </span>
            </div>
            <span>
              <b>Valor:</b> {formatToBRL(details.total ?? 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
