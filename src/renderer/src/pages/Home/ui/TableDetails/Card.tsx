import { motion } from 'framer-motion'

const cardStyles: Record<string, { bg: string }> = {
  mastercard: { bg: 'bg-gradient-to-r from-red-600 to-orange-500' },
  visa: { bg: 'bg-blue-600' },
  elo: { bg: 'bg-black' },
  amex: { bg: 'bg-blue-500' },
  nubank: { bg: 'bg-purple-600' },
  diners: { bg: 'bg-gray-500' },
  discover: { bg: 'bg-orange-400' },
  jcb: { bg: 'bg-green-500' },
  aura: { bg: 'bg-yellow-500' },
  hipercard: { bg: 'bg-red-700' },
  maestro: { bg: 'bg-blue-800' },
  pix: { bg: 'bg-teal-500' }
}

export const MiniCard: React.FC<{ type?: string }> = ({ type }) => {
  if (!type) return null
  const card = cardStyles[type.toLowerCase()] || cardStyles['pix']

  return (
    <div className="relative flex pl-2 pt-1.5 min-h-4 items-center justify-start w-fit">
      <motion.div
        className={`w-32 h-20 rounded-lg flex flex-col justify-between text-white ${card.bg} shadow-lg select-none absolute right-full top-2  scale-20 origin-top-right `}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        whileHover={{ scale: 1.05 }}
      >
        <div className="flex justify-between items-center p-2 ">
          <span className="text-xs leading-none">💳</span>
          <span className="text-xs uppercase font-extrabold">{type}</span>
        </div>

        <div className="bg-black h-2 w-full mb-2" />
      </motion.div>
      <motion.b className="text-sm ">{type}</motion.b>
    </div>
  )
}
