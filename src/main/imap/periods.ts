import type { ReceiptPeriod } from '../../shared/api'
import type { ImapAuth } from '../auth/AuthProvider'
import { createImapClient, toImapAppError } from './client'

const RECEIPT_SUBJECT_MARKER = 'com a Uber'

export interface ReceiptItem {
  date: Date
  subject: string
}

/**
 * Agrupa recibos por ano/mês a partir do calendário UTC da data, pois é
 * exatamente o que o IMAP SEARCH since/before compara na INTERNALDATE da
 * mensagem — usar o fuso local aqui poderia listar um mês que a busca depois
 * não encontra (ou esconder um mês que ela encontraria).
 */
export function groupPeriods(items: ReceiptItem[]): ReceiptPeriod[] {
  const byYear = new Map<number, Set<number>>()

  for (const item of items) {
    if (!item.subject.includes(RECEIPT_SUBJECT_MARKER)) continue
    const year = item.date.getUTCFullYear()
    const month = item.date.getUTCMonth() + 1
    if (!byYear.has(year)) byYear.set(year, new Set())
    byYear.get(year)!.add(month)
  }

  return [...byYear.entries()]
    .sort(([yearA], [yearB]) => yearB - yearA)
    .map(([year, months]) => ({
      year,
      months: [...months].sort((a, b) => b - a)
    }))
}

export async function listReceiptPeriods(auth: ImapAuth): Promise<ReceiptPeriod[]> {
  const client = createImapClient(auth)
  try {
    try {
      await client.connect()
    } catch (error) {
      throw toImapAppError(error)
    }
    await client.mailboxOpen('INBOX', { readOnly: true })

    const uids = await client.search({ from: 'noreply@uber.com' })
    if (!uids || uids.length === 0) return []

    const items: ReceiptItem[] = []
    for await (const message of client.fetch(uids, { envelope: true, internalDate: true })) {
      items.push({
        date: message.internalDate,
        subject: message.envelope?.subject ?? ''
      })
    }

    return groupPeriods(items)
  } finally {
    await client.logout().catch(() => undefined)
  }
}
