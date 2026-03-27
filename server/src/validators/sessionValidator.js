'use strict';

const { z } = require('zod');

// Common IANA timezone check (basic validation)
const timezoneSchema = z
  .string()
  .min(1)
  .max(64)
  .refine((tz) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, { message: 'Invalid IANA timezone' });

const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format');

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const createSessionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional().nullable(),
  timezone: timezoneSchema,
  dateStart: dateSchema,
  dateEnd: dateSchema,
  slotMinutes: z.number().int().min(5).max(480).default(30),
  dayStartTime: timeSchema.default('08:00'),
  dayEndTime: timeSchema.default('22:00'),
  includeWeekends: z.boolean().default(true),
  cfTurnstileResponse: z.string().optional(),
}).refine(
  (data) => data.dateStart <= data.dateEnd,
  { message: 'dateEnd must be on or after dateStart', path: ['dateEnd'] }
).refine(
  (data) => data.dayStartTime < data.dayEndTime,
  { message: 'dayEndTime must be after dayStartTime', path: ['dayEndTime'] }
);

const updateSessionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  timezone: timezoneSchema.optional(),
  dateStart: dateSchema.optional(),
  dateEnd: dateSchema.optional(),
  slotMinutes: z.number().int().min(5).max(480).optional(),
  dayStartTime: timeSchema.optional(),
  dayEndTime: timeSchema.optional(),
  includeWeekends: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.dateStart && data.dateEnd) return data.dateStart <= data.dateEnd;
    return true;
  },
  { message: 'dateEnd must be on or after dateStart', path: ['dateEnd'] }
).refine(
  (data) => {
    if (data.dayStartTime && data.dayEndTime) return data.dayStartTime < data.dayEndTime;
    return true;
  },
  { message: 'dayEndTime must be after dayStartTime', path: ['dayEndTime'] }
);

module.exports = { createSessionSchema, updateSessionSchema };
