import { cn } from '@/lib/utils'

/** Bloco de espera na cor da linha fina; pulsa devagar e fica parado com `prefers-reduced-motion`. */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn('animate-pulse rounded-control bg-border', className)}
      {...props}
    />
  )
}

export { Skeleton }
