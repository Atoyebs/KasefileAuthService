import { Lucia, TimeSpan } from 'lucia';
import { NodePostgresAdapter } from '@lucia-auth/adapter-postgresql';
import Database from '../db';

const db = new Database();
const pool = db.getPgPool();

const pgAdapter = new NodePostgresAdapter(pool, {
	user: 'user',
	session: 'session'
});

export const lucia = new Lucia(pgAdapter, {
	sessionExpiresIn: new TimeSpan(1, 'h'),
	sessionCookie: {
		attributes: {
			// set to `true` when using HTTPS
			secure: process.env.NODE_ENV === 'production'
		}
	},
	getUserAttributes: attributes => {
		return {
			// attributes has the type of DatabaseUserAttributes
			username: attributes.username,
			email: attributes.email,
			firstname: attributes.firstname,
			lastname: attributes.lastname
		};
	}
});

// IMPORTANT!
declare module 'lucia' {
	// eslint-disable-next-line no-unused-vars
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

interface DatabaseUserAttributes {
	username: string;
	email: string;
	firstname: string;
	lastname: string;
}
