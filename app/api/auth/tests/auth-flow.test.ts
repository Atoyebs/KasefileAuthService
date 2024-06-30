/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
import { doesDatabaseTableExist } from '@/app/testing/database/utility';
import Database from '@/app/db';
import {
	APIContainer,
	FlywayContainer,
	PostgresContainer,
	StartedAPIContainer,
	StartedPGContainer
} from '@/app/testing/models';
import { Network, StartedNetwork, Wait } from 'testcontainers';
import axios from 'axios';

import dotenv from 'dotenv';
dotenv.config();

// type SignupBody = z.infer<typeof signupReqBodySchema>;

/*
let environment: StartedDockerComposeEnvironment;
const composeFilePath = `${cwd()}`;
const composeFile = 'docker-compose.test.yml';
*/

const waitForPostgresDBLog = Wait.forLogMessage(
	'database system is ready to accept connections',
	2
);

describe('Auth APIs', () => {
	let network: StartedNetwork;
	let postgresContainer: StartedPGContainer;
	let apiContainer: StartedAPIContainer;

	beforeAll(async () => {
		/*
			Setup the Postgres container
			Setup the Database migrations via Flyway
		*/

		network = await new Network().start();
		const pgContainer = await new PostgresContainer().configure(network);
		postgresContainer = await pgContainer.withWaitStrategy(waitForPostgresDBLog).start();

		await new FlywayContainer().configure(network).start();

		apiContainer = await new APIContainer()
			.configure(network, { container: 3000, host: 3000 })
			.start();
	}, 70000);

	describe('Database table existence checks', () => {
		it('figure table should NOT exist', async () => {
			const db = new Database({
				connectionString: postgresContainer.getConnectionUri()
			});
			const doesExist = await doesDatabaseTableExist(db, 'figure');
			expect(doesExist).toBe(false);
		});

		it('user table should exist', async () => {
			const db = new Database({
				connectionString: postgresContainer.getConnectionUri()
			});
			const doesExist = await doesDatabaseTableExist(db, 'user');
			expect(doesExist).toBe(true);
		});

		it('session table should exist', async () => {
			const db = new Database({
				connectionString: postgresContainer.getConnectionUri()
			});
			const doesExist = await doesDatabaseTableExist(db, 'session');
			expect(doesExist).toBe(true);
		});
	});

	describe('Signup endpoint', () => {
		describe('API endpoint tests', () => {
			let baseUrl: string;

			const signupPostBody = {
				username: 'iTest',
				email: 'test.user@hotmail.com',
				password: 'testing123',
				firstname: 'Test',
				lastname: 'User'
			};

			beforeAll(async () => {
				baseUrl = `http://${apiContainer.getHost()}:${apiContainer.getFirstMappedPort()}`;
			});

			it('test route should return true with simple message', async () => {
				const testAuthRoute = `${baseUrl}/api/auth`;
				try {
					const { data } = await axios.post(`${testAuthRoute}`);
					expect(data).toEqual({
						success: true,
						message: "You've hit the auth route!"
					});
				} catch (error) {
					throw error;
				}
			}, 15000);

			it('signup route should return 400 error when username fails validation', async () => {
				try {
					await axios.post(`${baseUrl}/api/auth/signup`, {
						...signupPostBody,
						username: 'te'
					});
				} catch (error: any) {
					expect(error?.response?.status).toEqual(400);
					expect(error?.response?.data).toEqual({
						success: false,
						message: 'username: String must contain at least 3 character(s)'
					});
				}
			}, 15000);

			it('signup route should return 400 error when email fails validation', async () => {
				try {
					await axios.post(`${baseUrl}/api/auth/signup`, {
						...signupPostBody,
						email: 'incorrect-email.com'
					});
				} catch (error: any) {
					expect(error?.response?.status).toEqual(400);
					expect(error?.response?.data).toEqual({
						success: false,
						message: 'email: Invalid email'
					});
				}
			}, 15000);

			it('signup route should successfully register user', async () => {
				const { data, status, headers } = await axios.post(
					`${baseUrl}/api/auth/signup`,
					signupPostBody
				);
				expect(data.success).toBeTruthy();
				expect(data.message).toBe(
					`User ${signupPostBody.firstname} ${signupPostBody.lastname} has been Successfully Signed Up!`
				);
				expect(status).toBe(200);
				const setCookieHeader = headers['set-cookie'];
				expect(setCookieHeader).toBeDefined();
			}, 10000);

			it('signed up user should be found within database user table', async () => {
				const db = new Database({
					connectionString: postgresContainer.getConnectionUri()
				});
				const findUserFromUsernameOrEmailQuery = {
					text: `SELECT * FROM "user" WHERE username = $1 OR email = $1 LIMIT 1;`,
					values: [signupPostBody.email]
				};
				const pool = await db.connect();

				const user = (await pool.query(findUserFromUsernameOrEmailQuery))?.rows[0];
				await pool.release();
				expect(user?.username).toBe(signupPostBody.username);
				expect(user?.email).toBe(signupPostBody.email);
				expect(user?.firstname).toBe(signupPostBody.firstname);
				expect(user?.lastname).toBe(signupPostBody.lastname);
				expect(user?.id).toBeDefined();
			}, 10000);
		});
	});
});
