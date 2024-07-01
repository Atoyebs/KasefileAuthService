import '@/app/utility/zod-extensions';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { signupReqBodySchema } from './validation';
import bcrypt from 'bcryptjs';
import Database from '@/app/db';
import { lucia } from '@/app/auth/setup';
import { isEmptyValue } from '@/app/utility';

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();

		//parse the body of the request and check if validation is successful or not
		const { data, success, error } = signupReqBodySchema.safeParseV2(body);

		if (!success) {
			return Response.json({ success, message: error }, { status: 400 });
		}

		const { username, email, password, firstname, lastname } = data!;

		//query the user table in the database via email
		const db = new Database();
		const pool = await db.connect();

		const findUserQuery = {
			text: 'SELECT * FROM "user" WHERE email = $1',
			values: [email]
		};
		const count = (await pool.query(findUserQuery))?.rowCount;

		const existingFoundUserCount = isEmptyValue(count) ? 0 : (count as number);

		if (existingFoundUserCount > 0) {
			return Response.json(
				{ success: false, message: 'Error! User already exists' },
				{ status: 400 }
			);
		}
		const hashedPassword = await bcrypt.hashSync(password, 10);

		const createUserInsert = {
			text: 'INSERT INTO "user"(firstname, lastname, email, username, password) VALUES($1, $2, $3, $4, $5) RETURNING *',
			values: [firstname, lastname, email, username, hashedPassword]
		};
		const user = (await pool.query(createUserInsert))?.rows[0];

		delete user.password;
		delete user.created_at;

		const session = await lucia.createSession(user.id, {});

		const sessionCookie = await lucia.createSessionCookie(session.id);
		cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

		await pool.release();
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
				message: 'Internal Server Error Occurred',
				error
			},
			{ status: 500 }
		);
	}
}
