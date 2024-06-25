import '@/app/utility/zod-extensions';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';
import Database from '@/app/db';
import { lucia } from '@/app/auth/setup';
import { loginReqBodySchema } from './validation';
import { redirect } from 'next/navigation';

export async function POST(req: NextRequest) {
	const { data, success, error } = loginReqBodySchema.safeParseV2(
		await req.json()
	);

	//check if validation is successful or not, if it's not successful, return error response
	if (!success) {
		return Response.json({ success, message: error }, { status: 400 });
	}

	//get entered password and username/email
	const { password } = data!;
	const usernameOrEmailAddress =
		'email' in data! ? data!.email : data!.username;

	let user;
	let doPasswordsMatch = false;

	try {
		const findUserFromUsernameOrEmailQuery = {
			text: `SELECT * FROM users WHERE username = $1 OR email = $1 LIMIT 1;`,
			values: [usernameOrEmailAddress]
		};

		//open a database connection
		const db = await (await Database.getInstance()).getClient();
		user = (await db.query(findUserFromUsernameOrEmailQuery)).rows[0];
		const hashedPassword = user?.password || '';

		/*
      check if user exists; If no user is found in the database
      with the username or email address, return an error response
    */
		if (!user) {
			return Response.json(
				{
					success: false,
					message: `Error! User: ${usernameOrEmailAddress} does not exist`
				},
				{ status: 404 }
			);
		}

		//check if passwords match
		doPasswordsMatch = await bcrypt.compare(password, hashedPassword);

		//if passwords don't match, return an incorrect credentials error response
		if (!doPasswordsMatch) {
			return Response.json(
				{
					success: false,
					message: 'Error! Incorrect credentials provided'
				},
				{ status: 401 }
			);
		}
		//close the database connection
		await db.end();

		// if the passwords do match; create a new session with the user data
		const session = await lucia.createSession(user.id, {});
		const sessionCookie = lucia.createSessionCookie(session.id);
		cookies().set(
			sessionCookie.name,
			sessionCookie.value,
			sessionCookie.attributes
		);
	} catch (error) {
		return Response.json(
			{
				success: false,
				message: `Internal Server Error`
			},
			{ status: 500 }
		);
	}

	//if passwords match, return success response
	if (doPasswordsMatch) {
		//send a redirect to direct them to the login url
		return redirect(`${process.env.NEXT_SERVER_AUTHENTICATED_USER_BASE_URL}`);
	}
}
