import '@/app/utility/zod-extensions';
import { NextRequest } from 'next/server';
import { signupSchema } from './validation';
import bcrypt from 'bcrypt';
import Database from '@/app/db';

export async function POST(req: NextRequest) {
	const saltRounds = 10;

	try {
		//parse the body of the request
		const { data, success, error } = signupSchema.safeParseV2(await req.json());

		if (!success) {
			return Response.json({ success, message: error }, { status: 400 });
		}

		const { username, email, password, firstname, lastname } = data!;

		const hashedPassword = await bcrypt.hash(password, saltRounds);

		const db = (await Database.getInstance()).getClient();
		const query = {
			text: 'INSERT INTO "user"(firstname, lastname, email, username, password) VALUES($1, $2, $3, $4, $5) RETURNING *',
			values: [firstname, lastname, email, username, hashedPassword]
		};

		(await db).query(query);

		return Response.json(
			{
				success: true,
				message: 'User has been successfully signed up'
			},
			{ status: 200 }
		);
	} catch (error) {
		return Response.json(
			{
				success: false,
				message: 'Internal Server Error Occurred'
			},
			{ status: 500 }
		);
	}
}
