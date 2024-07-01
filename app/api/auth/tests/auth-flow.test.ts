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

const testTimeout = 12000;

describe('Auth APIs', () => {
	let network: StartedNetwork;
	let postgresContainer: StartedPGContainer;
	let apiContainer: StartedAPIContainer;
	let apiBaseUrl: string;

	const signupPostBody = {
		username: 'iTest',
		email: 'test.user@hotmail.com',
		password: 'testing123',
		firstname: 'Test',
		lastname: 'User'
	};

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

		apiBaseUrl = `http://${apiContainer.getHost()}:${apiContainer.getFirstMappedPort()}`;
	}, 95000);

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
		it(
			'route should return true with simple message',
			async () => {
				const testAuthRoute = `${apiBaseUrl}/api/auth`;
				try {
					const { data } = await axios.post(`${testAuthRoute}`);
					expect(data).toEqual({
						success: true,
						message: "You've hit the auth route!"
					});
				} catch (error) {
					throw error;
				}
			},
			testTimeout
		);

		it(
			'route should return 400 error when username fails validation',
			async () => {
				try {
					await axios.post(`${apiBaseUrl}/api/auth/signup`, {
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
			},
			testTimeout
		);

		it(
			'route should return 400 error when email fails validation',
			async () => {
				try {
					await axios.post(`${apiBaseUrl}/api/auth/signup`, {
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
			},
			testTimeout
		);

		it(
			'route should successfully register user',
			async () => {
				const { data, status, headers } = await axios.post(
					`${apiBaseUrl}/api/auth/signup`,
					signupPostBody
				);
				expect(data.success).toBeTruthy();
				expect(data.message).toBe(
					`User ${signupPostBody.firstname} ${signupPostBody.lastname} has been Successfully Signed Up!`
				);
				expect(status).toBe(200);
				const setCookieHeader = headers['set-cookie'];
				expect(setCookieHeader).toBeDefined();
			},
			testTimeout
		);

		it(
			'signed up user should be found within database user table',
			async () => {
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
			},
			testTimeout
		);
	});

	describe('Login endpoint', () => {
		const loginPostBody = {
			username: 'iTest',
			password: 'testing123'
		};

		it(
			'route should return 400 error when username or email property does not exist in request body',
			async () => {
				try {
					await axios.post(`${apiBaseUrl}/api/auth/login`, {
						treat: 'as',
						password: 'fix'
					});
				} catch (error: any) {
					expect(error?.response?.status).toEqual(400);
					expect(error?.response?.data).toEqual({
						success: false,
						message: 'undefined: Invalid input'
					});
				}
			},
			testTimeout
		);

		it('route should return 400 error when password property does not exist in request body', async () => {
			try {
				await axios.post(`${apiBaseUrl}/api/auth/login`, {
					email: 'as',
					england: 'island'
				});
			} catch (error: any) {
				expect(error?.response?.status).toEqual(400);
				expect(error?.response?.data).toEqual({
					success: false,
					message: 'undefined: Invalid input'
				});
			}
		});

		it('route should return 401 error when user does not exist OR is wrong user', async () => {
			try {
				await axios.post(`${apiBaseUrl}/api/auth/login`, {
					username: 'finalsay',
					password: 'england'
				});
			} catch (error: any) {
				expect(error?.response?.status).toEqual(401);
				expect(error?.response?.data).toEqual({
					success: false,
					message: `Error! Incorrect credentials provided`
				});
			}
		});

		it('route should return 401 invalid credentials error when password is incorrect', async () => {
			try {
				await axios.post(`${apiBaseUrl}/api/auth/login`, {
					username: signupPostBody.username,
					password: 'wonderboyzzzzzz'
				});
			} catch (error: any) {
				expect(error?.response?.status).toEqual(401);
				expect(error?.response?.data).toEqual({
					success: false,
					message: `Error! Incorrect credentials provided`
				});
			}
		});

		it('route should return 401 invalid credentials error when username is incorrect', async () => {
			try {
				await axios.post(`${apiBaseUrl}/api/auth/login`, {
					username: `whoereverYouGo`,
					password: signupPostBody.password
				});
			} catch (error: any) {
				expect(error?.response?.status).toEqual(401);
				expect(error?.response?.data).toEqual({
					success: false,
					message: `Error! Incorrect credentials provided`
				});
			}
		});

		it('route should return 401 invalid credentials error when email is incorrect', async () => {
			try {
				await axios.post(`${apiBaseUrl}/api/auth/login`, {
					email: `whoereverYouGo@gmail.com`,
					password: signupPostBody.password
				});
			} catch (error: any) {
				expect(error?.response?.status).toEqual(401);
				expect(error?.response?.data).toEqual({
					success: false,
					message: `Error! Incorrect credentials provided`
				});
			}
		});

		it('route should return redirect when username and password combination are correct', async () => {
			try {
				await axios.post(
					`${apiBaseUrl}/api/auth/login`,
					{
						username: signupPostBody.username,
						password: signupPostBody.password
					},
					{
						maxRedirects: 0
					}
				);
			} catch (error: any) {
				const status = error?.response.status;
				expect(error?.response?.status).toBeGreaterThanOrEqual(status);
				expect(error?.response?.status).toBeLessThanOrEqual(status);
				expect(error?.response?.statusText.toLowerCase().includes('redirect')).toBeTruthy();
				expect(error?.response?.headers?.location).toMatch(/\/user$/);
			}
		});

		it('route should return redirect when email and password combination are correct', async () => {
			try {
				await axios.post(
					`${apiBaseUrl}/api/auth/login`,
					{
						email: signupPostBody.email,
						password: signupPostBody.password
					},
					{
						maxRedirects: 0
					}
				);
			} catch (error: any) {
				const status = error?.response.status;
				expect(error?.response?.status).toBeGreaterThanOrEqual(status);
				expect(error?.response?.status).toBeLessThanOrEqual(status);
				expect(error?.response?.statusText.toLowerCase().includes('redirect')).toBeTruthy();
				expect(error?.response?.headers?.location).toMatch(/\/user$/);
			}
		});
	});
});
