import { useMemo } from 'react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'

// Mirror of the server guardrails in server/src/config (limits.*). Keeps the
// UI from letting someone build a session that the API would reject anyway.
export const MAX_SESSION_SPAN_DAYS = 92
export const MAX_SESSION_SLOTS = 5000

function sessionWithinBudget(d) {
  const start = Date.parse(`${d.dateStart}T00:00:00Z`)
  const end = Date.parse(`${d.dateEnd}T00:00:00Z`)
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return true // other refines report this

  const spanDays = Math.floor((end - start) / 86400000) + 1
  const toMin = (t) => {
    const [h, m] = String(t).substring(0, 5).split(':').map(Number)
    return h * 60 + m
  }
  const perDay = d.slotMinutes > 0 ? Math.max(0, Math.floor((toMin(d.dayEndTime) - toMin(d.dayStartTime)) / d.slotMinutes)) : 0
  return spanDays <= MAX_SESSION_SPAN_DAYS && spanDays * perDay <= MAX_SESSION_SLOTS
}

export function useCreateSessionSchema() {
  const { t } = useTranslation()
  return useMemo(
    () =>
      z
        .object({
          title: z.string().min(1, t('validation.titleRequired')).max(120, t('validation.titleTooLong')),
          description: z.string().max(500, t('validation.descriptionTooLong')).optional(),
          timezone: z.string().min(1, t('validation.timezoneRequired')),
          dateStart: z.string().min(1, t('validation.dateStartRequired')),
          dateEnd: z.string().min(1, t('validation.dateEndRequired')),
          slotMinutes: z.coerce.number().int().min(15).max(120),
          dayStartTime: z.string().min(1, t('validation.dayStartRequired')),
          dayEndTime: z.string().min(1, t('validation.dayEndRequired')),
          includeWeekends: z.boolean(),
        })
        .refine((d) => d.dateEnd >= d.dateStart, {
          message: t('validation.dateEndBeforeStart'),
          path: ['dateEnd'],
        })
        .refine((d) => d.dayEndTime > d.dayStartTime, {
          message: t('validation.dayEndBeforeStart'),
          path: ['dayEndTime'],
        })
        .refine(sessionWithinBudget, {
          message: t('validation.rangeTooLarge', { days: MAX_SESSION_SPAN_DAYS }),
          path: ['dateEnd'],
        }),
    [t]
  )
}

export function useJoinSessionSchema() {
  const { t } = useTranslation()
  return useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('validation.nameRequired')).max(60, t('validation.nameTooLong')),
      }),
    [t]
  )
}
