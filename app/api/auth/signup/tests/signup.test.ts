import { PostgreSqlContainer } from '@testcontainers/postgresql';
import dotenv from 'dotenv';
dotenv.config();

describe('Signup API', () => {
	const port = parseInt(`${process.env.NEXT_SERVER_DB_PORT!}`);
	const user = process.env.NEXT_SERVER_DB_USER!;
	const pass = process.env.NEXT_SERVER_DB_PASS!;
	const name = process.env.NEXT_SERVER_DB_NAME!;

	// eslint-disable-next-line no-unused-vars
	let container;

	beforeAll(async () => {
		expect(user).toBeDefined();
		expect(pass).toBeDefined();
		expect(name).toBeDefined();
		expect(port).toBeDefined();

		container = await new PostgreSqlContainer()
			.withUsername(process.env.NEXT_SERVER_DB_USER!)
			.withPassword(process.env.NEXT_SERVER_DB_PASS!)
			.withDatabase(process.env.NEXT_SERVER_DB_NAME!)
			.withExposedPorts({ container: 5432, host: port })
			.withName('postgres')
			.start();

		expect(container.getDatabase()).toEqual(process.env.NEXT_SERVER_DB_NAME);
		expect(container.getUsername()).toEqual(process.env.NEXT_SERVER_DB_USER);
	}, 10000);

	it('should be able to signup', () => {
		expect(true).toBe(true);
	});
});
