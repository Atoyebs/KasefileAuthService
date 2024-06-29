/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
import { doesDatabaseTableExist } from '../../../../testing/containers/database/utility';
import Database from '../../../../db';
import PostgresContainer, {
	StartedPGContainer
} from '@/app/testing/containers/models/postgres-container';
import HasuraContainer, {
	StartedHasuraContainer
} from '@/app/testing/containers/models/hasura-container';
import APIContainer, { StartedAPIContainer } from '@/app/testing/containers/models/api-container';
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

describe('Signup API', () => {
	let network: StartedNetwork;
	let postgresContainer: StartedPGContainer;
	let apiContainer: StartedAPIContainer;
	let hasuraContainer: StartedHasuraContainer;

	beforeAll(async () => {
		/*
			Setup the Postgres container
			Setup the Hasura container (including the database migrations)
		*/

		network = await new Network().start();
		const pgContainer = await new PostgresContainer().configure(network);
		postgresContainer = await pgContainer.withWaitStrategy(waitForPostgresDBLog).start();

		hasuraContainer = await new HasuraContainer()
			.configure(network, { container: 8080, host: 8080 })
			.withEnvironment({
				HASURA_GRAPHQL_DATABASE_URL: postgresContainer.internalNetworkDbUri,
				HASURA_GRAPHQL_ADMIN_SECRET: 'admin'
			})
			.start();

		apiContainer = await new APIContainer()
			.configure(network, { container: 3000, host: 3000 })
			.start();
	}, 90000);

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

	describe('API endpoint tests', () => {
		let baseUrl: string;

		const signupPostBody = {
			username: 'iTest',
			email: 'test@hotmail.com',
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
	});
});
