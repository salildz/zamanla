import { useMemo } from 'react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'

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
