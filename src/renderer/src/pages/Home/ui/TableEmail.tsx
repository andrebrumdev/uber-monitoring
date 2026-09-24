import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { formatToBRL } from 'brazilian-values'
import { Car, ChevronDown, CircleX, Coins, Wallet } from 'lucide-react'
import React from 'react'
import { TableDetails } from './TableDetails'

export const TableEmail: React.FC<{ emails?: Email[] }> = ({ emails }) => {
  if (!emails || emails.length === 0) return null

  return (
    <Table className="border">
      <TableHeader>
        <TableRow>
          <TableHead>Assunto</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Total</TableHead>
          <TableHead className="w-6">Expadir</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {emails.map((email, index) => (
          <Collapsible asChild key={index + 1}>
            <>
              <TableRow>
                <TableCell>{email.subject}</TableCell>
                <TableCell>{email.date}</TableCell>
                <TableCell>{email.content.type}</TableCell>
                <TableCell>{formatToBRL(email.content.total ?? 0)}</TableCell>
                <CollapsibleTrigger asChild>
                  <TableCell className="flex items-center justify-center">
                    <ChevronDown />
                  </TableCell>
                </CollapsibleTrigger>
              </TableRow>
              <CollapsibleContent key={index + 1} asChild>
                <TableRow>
                  <TableCell colSpan={5} className="bg-accent/10">
                    <TableDetails details={email.content} />
                  </TableCell>
                </TableRow>
              </CollapsibleContent>
            </>
          </Collapsible>
        ))}
      </TableBody>
      <TableCaption>
        <div className="flex flex-row justify-between items-center">
          <div>
            Total de <b>{emails.length}</b> emails
          </div>
          <ul className="flex flex-row *:px-2 divide-x">
            <li className="flex items-center gap-1">
              <b className="flex items-center gap-1">
                <CircleX aria-hidden className="size-3.5" /> Cancelada:
              </b>
              {emails.filter((e) => e.content.type === 'cancelada').length}
            </li>
            <li className="flex items-center gap-1">
              <b className="flex items-center gap-1">
                <Car aria-hidden className="size-3.5" /> Viagem:
              </b>
              {emails.filter((e) => e.content.type === 'viagem').length}
            </li>
            <li className="flex items-center gap-1">
              <b className="flex items-center gap-1">
                <Coins aria-hidden className="size-3.5" /> Recarga:
              </b>
              {emails.filter((e) => e.content.type === 'recarga').length}
            </li>
          </ul>
          <div className="flex items-center gap-1">
            <b className="flex items-center gap-1">
              <Wallet aria-hidden className="size-3.5" /> Total:
            </b>
            {formatToBRL(emails.reduce((acc, e) => (e.content.total ?? 0) + acc, 0))}
          </div>
        </div>
      </TableCaption>
    </Table>
  )
}
