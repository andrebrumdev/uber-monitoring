enum TypeOfViagem {
  recarga = 'recarga',
  viagem = 'viagem',
  cancelada = 'cancelada'
}

interface RecargaType extends EmailBase {
  type: `${TypeOfViagem.recarga}`
}

/** Uma linha de "Pagamentos" do recibo; o estorno vem com valor negativo. */
interface CanceledPayment {
  method: string
  /** "d/m/aaaa hh:mm", como o recibo escreve. */
  date?: string
  amount: number
  refund: boolean
}

interface CanceledType extends EmailBase {
  type: `${TypeOfViagem.cancelada}`
  paymentMethod?: string
  subtotal?: number
  /** Composição da taxa; cada uma só existe quando o recibo traz a linha. */
  time?: number
  distance?: number
  convenienceFee?: number
  payments?: CanceledPayment[]
  /** Categoria da viagem, como "UberX". */
  product?: string
}

type Destination = {
  time?: string
  rua?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
} | null

interface ViagemType extends EmailBase {
  type: `${TypeOfViagem.viagem}`
  paymentMethod?: string
  subtotal?: number
  fixedCost?: number
  // informação da viagem
  tip?: number
  distance?: string
  duration?: string
  driver?: string
  pickup?: Destination
  dropoff?: Destination
  rating?: number
  credit?: number
}

interface EmailBase {
  content: string
  type: typeof TypeOfViagem
  total?: number
}

type EmailData = RecargaType | ViagemType | CanceledType

interface Email {
  subject: string
  from: string
  date: string
  content: EmailData
}
