import { ImapFlow } from 'imapflow'
import { Readable, Transform, TransformCallback } from 'stream'
import * as cheerio from 'cheerio'
import { ParsedMail, simpleParser } from 'mailparser'

async function connectToGmail() {
  try {
    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: import.meta.env.MAIN_VITE_EMAIL,
        pass: import.meta.env.MAIN_VITE_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      },
      logger: false
    })
    await client.connect()
    await client.mailboxOpen('INBOX')
    return client
  } catch (error) {
    console.error('Erro ao conectar ao Gmail:', error)
    throw error
  }
}

function cleanHtml(html: string): [string, string] {
  const $ = cheerio.load(html)
  const decodedText = $.text($('body'))
  return [decodedText, $.html({ scriptingEnabled: false })]
}

function extractEmailData(textContent = '', htmlContent = ''): EmailData {
  console.log(textContent)

  function extractWithRegex(pattern: RegExp): string {
    const match = pattern.exec(textContent)
    return match ? match[1].trim() : ''
  }
  function* extractGlobalWithRegex(pattern: RegExp): Generator<string[]> {
    const match = textContent.matchAll(pattern)
    for (const m of match) {
      yield m ? m.map((d) => d?.trim()) : []
    }
  }
  function extractNumberWithRegex(pattern: RegExp): number {
    const match = extractWithRegex(pattern)
    return match ? parseFloat(match.replace(',', '.')) : 0
  }

  const isRecharge = textContent.toLowerCase().includes('uber cash')
  const isCanceled = textContent.toLowerCase().includes('cancelada')

  if (isRecharge) {
    return {
      content: htmlContent,
      type: 'recarga',
      total: extractNumberWithRegex(/Você adicionou R\$\s*([\d.,]+)/i)
    }
  }

  if (isCanceled) {
    return {
      content: htmlContent,
      type: 'cancelada',
      total: extractNumberWithRegex(/Total.*?R\$\D*([\d.,]+)/i),
      paymentMethod:
        extractWithRegex(
          /(Mastercard|Visa|Elo|Amex|Nubank|diners|discover|jcb|aura|hipercard|maestro)/i
        ) || 'Desconhecido',
      subtotal: extractNumberWithRegex(/Subtotal.*?R\$\D*([\d.,]+)/i),
      fixedCost: extractNumberWithRegex(/Custo fixo[^+]R\$\s*([\d.,]+)/i)
    }
  }

  const trade = extractGlobalWithRegex(
    /(\d{1,2}:\d{2})\s*(.+?)[\s*][-,]\s*(.+?)\s*[,-]\s*(Manaus)\s*[-,]\s*(AM)[-,]\s*(\d{5}(?:-\d{3})?)/gi
  )
  const arrayToDestination = (d?: Array<string>): Destination => {
    if (!d) return null
    return {
      time: d[1],
      rua: d[2],
      bairro: d[3],
      cidade: d[4],
      estado: d[5],
      cep: d[6]
    }
  }

  return {
    content: htmlContent,
    type: 'viagem',
    driver: extractWithRegex(/viajou com\s+([\^a-z]+)/i) || 'Desconhecido',
    rating: extractNumberWithRegex(/(\d+\.\d+)+Avaliação/i),
    paymentMethod:
      extractWithRegex(
        /(Mastercard|Visa|Elo|Amex|Nubank|diners|discover|jcb|aura|hipercard|maestro)/i
      ) || 'Desconhecido',
    total: extractNumberWithRegex(/Total.*?R\$\D*([\d.,]+)/i),
    subtotal: extractNumberWithRegex(/Subtotal.*?R\$\D*([\d.,]+)/i),
    fixedCost: extractNumberWithRegex(/Custo fixo[^+]R\$\D*([\d.,]+)/i),
    distance: extractWithRegex(/(\d+\.\d+)\s+Quil[^+]+/i),
    duration: extractWithRegex(/min\D*([\d:]+)/i) + ' min',
    pickup: arrayToDestination(trade.next().value),
    dropoff: arrayToDestination(trade.next().value),
    tip: extractNumberWithRegex(/(gorjeta|tip).*?R\$\s*([\d.,]+)/i),
    credit: extractNumberWithRegex(/ganhou.*?R\$\D*([\d.,]+) em cr.*ditos/i)
  }
}
class EmailTransform extends Transform {
  constructor() {
    super({ objectMode: true })
  }

  _transform(emailData: any, _encoding: BufferEncoding, callback: TransformCallback) {
    try {
      this.push({
        subject: emailData.subject || 'Sem assunto',
        from: emailData.from || 'Desconhecido',
        date:
          new Date(emailData.date).toLocaleString('pt-BR', { timeZone: 'UTC' }) || 'Desconhecido',
        content: extractEmailData(...cleanHtml(emailData.body))
      })
      callback()
    } catch (error) {
      callback(error as Error)
    }
  }
}

export const fetchEmails = async (month: number, year: number): Promise<any[]> => {
  const client = await connectToGmail()
  try {
    const startDate = new Date(year, month - 1, 1).toISOString()
    const endDate = new Date(year, month, 1).toISOString()

    const messages = client.fetch(
      {
        since: startDate,
        before: endDate,
        from: 'noreply@uber.com'
      },
      { source: true, envelope: true, bodyStructure: true, bodyParts: [] }
    )

    const emailStream = new Readable({ objectMode: true, read: () => {} })
    const emailTransform = new EmailTransform()
    emailStream.pipe(emailTransform)

    for await (const message of messages) {
      if (!message.source || !message.envelope.subject.includes('com a Uber')) continue
      const parsedMail: ParsedMail = await simpleParser(message.source, {
        encoding: 'utf8',
        defaultEncoding: 'utf8'
      })
      const body = parsedMail.html || ''
      emailStream.push({
        subject: message.envelope.subject || 'Sem assunto',
        from: message.envelope.from?.[0]?.address || 'Desconhecido',
        date: message.envelope.date || 'Desconhecido',
        body
      })
    }

    emailStream.push(null)
    await client.logout()

    return new Promise((resolve) => {
      const emails: any[] = []
      emailTransform.on('data', (data) => emails.push(data))
      emailTransform.on('end', () => resolve(emails))
    })
  } catch (error) {
    console.error('Erro ao ler as mensagens do Gmail:', error)
    throw error
  }
}
