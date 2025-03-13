enum TypeOfViagem {
  recarga = 'recarga',
  viagem = 'viagem',
  cancelada = 'cancelada'
}

interface RecargaType extends EmailBase {
  type: `${TypeOfViagem.recarga}`
}

interface CanceledType extends EmailBase {
  type: `${TypeOfViagem.cancelada}`
  paymentMethod?: string
  subtotal?: number
  fixedCost?: number
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
