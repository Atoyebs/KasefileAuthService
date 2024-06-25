import z from 'zod';

export const signupReqBodySchema = z.object({
	username: z.string().min(3),
	email: z.string().email(),
	password: z.string().min(6),
	firstname: z.string(),
	lastname: z.string()
});
