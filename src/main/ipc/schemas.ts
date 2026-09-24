import { z } from 'zod'
import { AppError } from '../errors'

export const loginArgsSchema = z.tuple([
  z.string().trim().pipe(z.email()),
  z.string().refine((value) => value.trim().length > 0)
])

export const fetchArgsSchema = z.tuple([
  z.number().int().min(1).max(12),
  z
    .number()
    .int()
    .min(2004)
    .refine((year) => year <= new Date().getFullYear())
])

export function parseArgs<T>(schema: z.ZodType<T>, args: unknown, message: string): T {
  const result = schema.safeParse(args)
  if (!result.success) throw new AppError('INVALID_INPUT', message)
  return result.data
}
