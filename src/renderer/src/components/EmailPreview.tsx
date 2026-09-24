import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { ShieldCheck } from 'lucide-react'
import type { ReactElement } from 'react'

interface EmailPreviewProps {
  html: string
  trigger: ReactElement
}

export function EmailPreview({ html, trigger }: EmailPreviewProps) {
  const isEmpty = html.trim().length === 0

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex h-[85vh] max-w-[920px] flex-col">
        <DialogHeader>
          <DialogTitle>E-mail original</DialogTitle>
          <DialogDescription>
            <ShieldCheck aria-hidden className="size-3.5 shrink-0" />
            Scripts e imagens externas ficam bloqueados por segurança.
          </DialogDescription>
        </DialogHeader>
        {isEmpty ? (
          <div className="flex flex-1 items-center justify-center rounded-control border border-border text-sm text-muted-foreground">
            Este recibo não tem conteúdo para mostrar.
          </div>
        ) : (
          // sandbox vazio: sem scripts, sem acesso ao app, sem popups nem navegação do topo
          <iframe
            title="Conteúdo do e-mail"
            sandbox=""
            srcDoc={html}
            className="w-full flex-1 rounded-control border border-border bg-white"
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
