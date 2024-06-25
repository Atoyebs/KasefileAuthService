import { z } from 'zod';

const zodPasswordRules = {
	min: 6,
	message: 'Password must be at least 6 characters long'
};

const usernameAndPasswordReqBodySchema = z.object({
	username: z.string().min(1, 'Username is required'),
	password: z.string().min(zodPasswordRules.min, zodPasswordRules.message)
});

const emailAndPasswordReqBodySchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(zodPasswordRules.min, zodPasswordRules.message)
});

// Create a union of the two schemas
export const loginReqBodySchema = z.union([
	usernameAndPasswordReqBodySchema,
	emailAndPasswordReqBodySchema
]);
