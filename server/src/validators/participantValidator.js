'use strict';

const { z } = require('zod');

function normalizeOptionalToken(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const turnstileTokenSchema = z.preprocess(normalizeOptionalToken, z.string().optional());

const ruleSchema = z.object({
  weekdays: z
    .array(z.number().int().min(0).max(6))
    .min(1, 'At least one weekday required')
    .max(7),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'startTime must be HH:MM'),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'endTime must be HH:MM'),
}).refine(
  (r) => r.startTime < r.endTime,
  { message: 'endTime must be after startTime', path: ['endTime'] }
);

const slotOverrideSchema = z.object({
  slotStart: z.string().datetime({ message: 'slotStart must be an ISO 8601 datetime' }),
  slotEnd: z.string().datetime({ message: 'slotEnd must be an ISO 8601 datetime' }).optional(),
  status: z.enum(['available', 'unavailable']).default('available'),
  sourceType: z.literal('manual').default('manual'),
});

const createParticipantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  cfTurnstileResponse: turnstileTokenSchema,
  // Backward compatibility: older clients may still send turnstileToken.
  turnstileToken: turnstileTokenSchema,
}).transform(({ turnstileToken, cfTurnstileResponse, ...rest }) => ({
  ...rest,
  cfTurnstileResponse: cfTurnstileResponse || turnstileToken,
}));

const updateParticipantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  rules: z.array(ruleSchema).optional(),
  slots: z.array(slotOverrideSchema).optional(),
});

module.exports = { createParticipantSchema, updateParticipantSchema, ruleSchema, slotOverrideSchema };
