import { cn } from '@/lib/utils'
import * as React from 'react'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        'flex h-10 w-full min-w-0 rounded-control border border-input bg-card px-3 text-[15px] text-foreground outline-none',
        'transition-[border-color,box-shadow,color] duration-300 ease-out-quart',
        'placeholder:text-muted-foreground',
        'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/40',
        'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/25',
        'read-only:text-muted-foreground',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
