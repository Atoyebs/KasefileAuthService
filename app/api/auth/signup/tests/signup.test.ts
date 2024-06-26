import {
	PostgreSqlContainer,
	StartedPostgreSqlContainer
} from '@testcontainers/postgresql';
import { GenericContainer, Network } from 'testcontainers';
import cwd from 'cwd';
import { doesDatabaseTableExist } from '../../../../testing/containers/database/utility';
import Database from '../../../../db';
import dotenv from 'dotenv';
dotenv.config();

describe('Signup API', () => {
	const port = parseInt(`${process.env.NEXT_SERVER_DB_PORT!}`);
	const user = process.env.NEXT_SERVER_DB_USER!;
	const pass = process.env.NEXT_SERVER_DB_PASS!;
	const name = process.env.NEXT_SERVER_DB_NAME!;

	const volumesDirRelative = `${cwd()}/app/testing/containers/volumes`;

	let network;
	let postgresContainer: StartedPostgreSqlContainer;
	// eslint-disable-next-line no-unused-vars
	let hasuraContainer;

	beforeAll(async () => {
		network = await new Network().start();
		postgresContainer = await new PostgreSqlContainer()
			.withUsername(user)
			.withPassword(pass)
			.withDatabase(name)
			.withExposedPorts({ container: 5432, host: port })
			.withName('pg')
			.withNetwork(network)
			.withNetworkAliases('pg')
			.start();

		const internalUri = postgresContainer
			.getConnectionUri()
			.replace(/localhost/g, 'pg');

		hasuraContainer = await new GenericContainer(
			'hasura/graphql-engine:v2.40.1.cli-migrations-v3'
		)
			.withNetwork(network)
			.withCopyDirectoriesToContainer([
				{
					source: `${volumesDirRelative}/hasura/metadata`,
					target: '/hasura-metadata'
				},
				{
					source: `${volumesDirRelative}/hasura/migrations`,
					target: '/hasura-migrations'
				}
			])
			.withName('hasura-test')
			.withExposedPorts({ container: 8080, host: 8080 })
			.withEnvironment({
				HASURA_GRAPHQL_DATABASE_URL: internalUri,
				HASURA_GRAPHQL_ADMIN_SECRET: 'admin'
			})
			.withStartupTimeout(8000)
			.start();

		expect(postgresContainer.getDatabase()).toEqual(
			process.env.NEXT_SERVER_DB_NAME
		);
		expect(postgresContainer.getUsername()).toEqual(
			process.env.NEXT_SERVER_DB_USER
		);
	}, 30000);

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
});
