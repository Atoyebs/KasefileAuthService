import '@/app/utility/zod-extensions';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import Database from '@/app/db';
import { lucia } from '@/app/auth/setup';
import { loginReqBodySchema } from './validation';
// import { redirect } from 'next/navigation';

export async function POST(req: NextRequest) {
	const { data, success, error } = loginReqBodySchema.safeParseV2(await req.json());

	//check if validation is successful or not, if it's not successful, return error response
	if (!success) {
		return Response.json({ success, message: error }, { status: 400 });
	}

	//get entered password and username/email
	const { password } = data!;
	const usernameOrEmailAddress = 'email' in data! ? data!.email : data!.username;

	let user;
	let doPasswordsMatch = false;

	try {
		const findUserFromUsernameOrEmailQuery = {
			text: `SELECT * FROM "user" WHERE username = $1 OR email = $1 LIMIT 1;`,
			values: [usernameOrEmailAddress]
		};

		//open a database connection
		const db = new Database();
		const pool = await db.connect();

		const result = await pool.query(findUserFromUsernameOrEmailQuery);
		user = result?.rows[0];
		const hashedPassword = user?.password || '';

		//check if passwords match
		doPasswordsMatch = await bcrypt.compareSync(password, hashedPassword);

		//if user isn't found OR passwords don't match, return an incorrect credentials error response
		if (!user || !doPasswordsMatch) {
			return Response.json(
				{
					success: false,
					message: 'Error! Incorrect credentials provided'
				},
				{ status: 401 }
			);
		}
		//close the database connection
		await pool.release();
		// if the passwords do match; create a new session with the user data
		const session = await lucia.createSession(user.id, {});
		const sessionCookie = lucia.createSessionCookie(session.id);
		cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
		return NextResponse.redirect(process.env.NEXT_SERVER_LOGIN_SUCCESS_REDIRECT!);
	} catch (error) {
		return Response.json(
			{
				success: false,
				message: `Internal Server Error`,
				error
			},
			{ status: 500 }
		);
	}
}
