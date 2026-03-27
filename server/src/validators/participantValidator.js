'use strict';

const { z } = require('zod');

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
  status: z.enum(['available', 'unavailable']).default('available'),
  sourceType: z.enum(['manual', 'rule_derived']).default('manual'),
});

const createParticipantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  cfTurnstileResponse: z.string().optional(),
});

const updateParticipantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  rules: z.array(ruleSchema).optional(),
  slots: z.array(slotOverrideSchema).optional(),
});

module.exports = { createParticipantSchema, updateParticipantSchema, ruleSchema, slotOverrideSchema };
