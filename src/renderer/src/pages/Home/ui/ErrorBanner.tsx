import { CircleAlert, X } from 'lucide-react'
import type { ErrorCode } from '../../../../../shared/api'

const TITLES: Partial<Record<ErrorCode, string>> = {
  NETWORK: 'Sem conexão com o Gmail',
  AUTH_FAILED: 'Sua senha de app não vale mais',
  INVALID_INPUT: 'Mês ou ano inválido'
}
const FALLBACK_TITLE = 'Algo deu errado'

/**
 * Texto próprio do renderer para códigos em que a mensagem do main contradiz o título.
 * AUTH_FAILED na Home significa senha salva revogada, não digitação errada (design §3.3).
 */
const BODIES: Partial<Record<ErrorCode, string>> = {
  AUTH_FAILED: 'O Gmail recusou a senha salva. Saia e entre de novo com uma senha de app nova.'
}

interface ErrorBannerProps {
  code: ErrorCode
  message: string
  onClose: () => void
}

export function ErrorBanner({ code, message, onClose }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="animate-banner-in flex items-start gap-3 rounded-panel border border-destructive/30 bg-destructive-surface px-5 py-4"
    >
      <CircleAlert aria-hidden className="size-5 shrink-0 text-destructive" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[15px] leading-5 font-medium text-foreground">
          {TITLES[code] ?? FALLBACK_TITLE}
        </p>
        <p className="text-sm text-muted-foreground">{BODIES[code] ?? message}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar aviso"
        className="-m-1.5 shrink-0 rounded-control p-1.5 text-muted-foreground outline-none transition-colors duration-300 ease-out-quart hover:bg-destructive/10 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  )
}
