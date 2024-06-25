import '@/app/utility/zod-extensions';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { signupReqBodySchema } from './validation';
import bcrypt from 'bcrypt';
import Database from '@/app/db';
import { lucia } from '@/app/auth/setup';

export async function POST(req: NextRequest) {
	const saltRounds = 10;

	try {
		//parse the body of the request
		const { data, success, error } = signupReqBodySchema.safeParseV2(
			await req.json()
		);

		if (!success) {
			return Response.json({ success, message: error }, { status: 400 });
		}

		const { username, email, password, firstname, lastname } = data!;

		//query the user table in the database via email
		const db = await (await Database.getInstance()).getClient();
		const findUserQuery = {
			text: 'SELECT * FROM "user" WHERE email = $1',
			values: [email]
		};

		const existingFoundUserCount =
			(await db.query(findUserQuery))?.rowCount || 1;

		if (existingFoundUserCount > 0) {
			return Response.json(
				{ success: false, message: 'Error! User already exists' },
				{ status: 400 }
			);
		}

		const hashedPassword = await bcrypt.hash(password, saltRounds);

		const createUserInsert = {
			text: 'INSERT INTO "user"(firstname, lastname, email, username, password) VALUES($1, $2, $3, $4, $5) RETURNING *',
			values: [firstname, lastname, email, username, hashedPassword]
		};

		const user = (await db.query(createUserInsert)).rows[0];

		delete user.password;
		delete user.created_at;

		const session = await lucia.createSession(user.id, {});

		const sessionCookie = await lucia.createSessionCookie(session.id);
		cookies().set(
			sessionCookie.name,
			sessionCookie.value,
			sessionCookie.attributes
		);

		await db.end();

		return Response.json(
			{
				success: true,
				message: `User ${firstname} ${lastname} has been Successfully Signed Up!`,
				data: user
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
