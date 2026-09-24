import { Brand } from '@/components/brand'
import { Ribbon } from '@/components/ribbon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { prefersReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { ArrowUpRight, ChevronRight, CircleAlert, LoaderCircle, LockKeyhole } from 'lucide-react'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'

const APP_PASSWORD_URL = 'https://myaccount.google.com/apppasswords'
/** Duração do esmaecimento da coluna depois do login (design §3.1, estado Sucesso). */
const EXIT_MS = 300

interface LoginForm {
  email: string
  password: string
}

export function Login({ onLoggedIn }: { onLoggedIn: (email: string) => void }) {
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { isSubmitting }
  } = useForm<LoginForm>({ defaultValues: { email: '', password: '' } })
  const [error, setError] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)

  const id = useId()
  const emailId = `${id}-email`
  const passwordId = `${id}-password`
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  const onSubmit = async (data: LoginForm): Promise<void> => {
    setError(null)
    const result = await window.api.auth.login(data.email, data.password)
    if (!result.ok) {
      setError(result.error.message)
      setFocus('password')
      return
    }
    const email = data.email.trim()
    if (!prefersReducedMotion()) {
      setLeaving(true)
      await new Promise((resolve) => setTimeout(resolve, EXIT_MS))
    }
    onLoggedIn(email)
  }

  const busy = isSubmitting || leaving
  const invalid = error ? true : undefined

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[linear-gradient(180deg,var(--ground),var(--ground-end))] min-[900px]:flex-row">
      <Ribbon
        orientation="horizontal"
        slow={busy}
        className="h-[120px] w-full shrink-0 min-[900px]:hidden"
      />
      <Ribbon
        orientation="vertical"
        slow={busy}
        className="absolute inset-y-0 right-0 hidden h-full w-[45%] min-[900px]:block"
      />

      <div
        className={cn(
          'relative z-10 flex flex-1 flex-col justify-center px-[clamp(24px,6vw,48px)] py-10',
          'min-[900px]:w-[max(48%,460px)] min-[900px]:flex-none min-[900px]:py-8 min-[900px]:pr-10 min-[900px]:pl-[clamp(40px,7.5vw,96px)]',
          leaving && 'animate-fade-out'
        )}
      >
        <div className="@container flex w-full max-w-[560px] flex-col">
          <Brand />

          <h1 className="mt-10 text-[clamp(32px,10.5cqi,56px)] leading-[1.05] font-medium tracking-[-0.025em] text-balance">
            <span className="block text-foreground">Seu mês de corridas,</span>
            <span className="block text-primary">num só lugar.</span>
          </h1>

          <p className="mt-5 max-w-[44ch] text-lg leading-[1.6] text-muted-foreground">
            Conecte o Gmail onde chegam os recibos da Uber. O app só lê esses recibos — nada é
            enviado nem apagado.
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            aria-label="Entrar com o Gmail"
            className="mt-8 flex w-full max-w-[380px] flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor={emailId} className="text-sm font-medium text-foreground">
                E-mail do Gmail
              </label>
              <Input
                id={emailId}
                type="email"
                autoComplete="username"
                autoFocus
                spellCheck={false}
                readOnly={busy}
                aria-invalid={invalid}
                aria-describedby={error ? errorId : undefined}
                className="h-11"
                {...register('email')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={passwordId} className="text-sm font-medium text-foreground">
                Senha de app
              </label>
              <Input
                id={passwordId}
                type="password"
                autoComplete="current-password"
                readOnly={busy}
                aria-invalid={invalid}
                aria-describedby={cn(hintId, error && errorId)}
                className="h-11"
                {...register('password')}
              />
              <p id={hintId} className="text-[13px] leading-normal text-muted-foreground">
                Não é a senha normal do Google.{' '}
                <a
                  href={APP_PASSWORD_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:ring-[3px] focus-visible:ring-ring/40"
                >
                  Gere uma senha de app
                  <ArrowUpRight aria-hidden className="size-3.5" />
                  <span className="sr-only"> (abre no navegador)</span>
                </a>{' '}
                — leva 1 minuto e exige verificação em duas etapas.
              </p>
            </div>

            {error && (
              <p
                id={errorId}
                role="alert"
                className="animate-banner-in flex items-start gap-2 text-sm text-destructive"
              >
                <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="group mt-1 h-11 w-full rounded-control text-[15px] shadow-none transition-colors duration-300 ease-out-quart hover:bg-primary-hover active:bg-primary-active disabled:opacity-80"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle aria-hidden className="size-4 animate-spin" />
                  Verificando…
                </>
              ) : (
                <>
                  Entrar
                  <ChevronRight
                    aria-hidden
                    className="size-4 transition-transform duration-300 ease-out-quart group-hover:translate-x-0.5"
                  />
                </>
              )}
            </Button>

            <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <LockKeyhole aria-hidden className="size-3.5 shrink-0" />
              Sua senha fica guardada cifrada neste computador.
            </p>
          </form>
        </div>
      </div>
    </main>
  )
}
