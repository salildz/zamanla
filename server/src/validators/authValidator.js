'use strict';

const { z } = require('zod');

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Email must be valid')
  .max(320, 'Email too long');

const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password too long'),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

module.exports = {
  registerSchema,
  loginSchema,
};
