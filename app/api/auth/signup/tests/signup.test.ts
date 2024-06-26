import { doesDatabaseTableExist } from '../../../../testing/containers/database/utility';
import Database from '../../../../db';
import dotenv from 'dotenv';
import { signupReqBodySchema } from '../validation';
import PostgresContainer, {
	StartedPGContainer
} from '@/app/testing/containers/models/postgres-container';
import HasuraContainer, {
	StartedHasuraContainer
} from '@/app/testing/containers/models/hasura-container';
import { Network, Wait } from 'testcontainers';
dotenv.config();

// type SignupBody = z.infer<typeof signupReqBodySchema>;

describe('Signup API', () => {
	let network;
	let postgresContainer: StartedPGContainer;
	let hasuraContainer: StartedHasuraContainer;

	beforeAll(async () => {
		network = await new Network().start();

		const pgContainer = await new PostgresContainer().configure(network);
		postgresContainer = await pgContainer.withStartupTimeout(15000).start();

		// await postgresContainer.stop({ remove: false });

		hasuraContainer = await new HasuraContainer()
			.configure(network, { container: 8080, host: 8080 })
			.withEnvironment({
				HASURA_GRAPHQL_DATABASE_URL: postgresContainer.internalNetworkDbUri,
				HASURA_GRAPHQL_ADMIN_SECRET: 'admin'
			})
			.withStartupTimeout(20000)
			.start();

		// await hasuraContainer.stop({ remove: false });

		expect(postgresContainer.getDatabase()).toEqual(process.env.NEXT_SERVER_DB_NAME);
		expect(postgresContainer.getUsername()).toEqual(process.env.NEXT_SERVER_DB_USER);
	}, 65000);

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

	// afterAll(async () => {
	// 	await hasuraContainer.stop();
	// 	await postgresContainer.stop();
	// });
});
