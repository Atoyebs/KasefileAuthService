import Database from '@/app/db';
import {
	PostgreSqlContainer,
	StartedPostgreSqlContainer
} from '@testcontainers/postgresql';
import { StartedNetwork } from 'testcontainers';

/**
 * Checks if a table exists in the database.
 *
 * @param {Database} database - The database (object) connection to use.
 * @param {string} tableName - The name of the table to check.
 * @return {Promise<boolean>} Whether the table exists or not.
 */
export async function doesDatabaseTableExist(
	database: Database,
	tableName: string
): Promise<boolean> {
	const pool = await database.connect();
	const result = await pool.query(
		`SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = '${tableName}'
    );`
	);

	await pool.release();
	return result.rows[0].exists;
}

/**
 * Function to create a **temporary Postgres container** for testing.
 *
 * @param {string} user - The name of the user for the database.
 * @param {string} pass - The password for the associated user for the database.
 * @param {string} name - The name of the database.
 * @param {number} port - The port number of the container **to expose on the host**.
 * @param {StartedNetwork} network - The **(shared) network** configuration for the container (*used by the other containers*).
 * @return {Promise<{ pgContainer: StartedPostgreSqlContainer; internalNetworkUri: string; networkAlias: string; }>} The created Postgres container, modified database URI, and network alias.
 */
export async function createaAndStartPostgresContainer({
	user,
	pass,
	name,
	port,
	network
}: {
	user: string;
	pass: string;
	name: string;
	port: number;
	network: StartedNetwork;
}): Promise<{
	pgContainer: StartedPostgreSqlContainer;
	internalNetworkUri: string;
	networkAlias: string;
}> {
	const alias = 'pg';

	const postgresContainer: StartedPostgreSqlContainer =
		await new PostgreSqlContainer()
			.withUsername(user)
			.withPassword(pass)
			.withDatabase(name)
			.withExposedPorts({ container: 5432, host: port })
			.withName(alias)
			.withNetwork(network)
			.withNetworkAliases(alias)
			.start();

	const internalUri = postgresContainer
		.getConnectionUri()
		.replace(/localhost/g, alias);

	return {
		pgContainer: postgresContainer,
		internalNetworkUri: internalUri,
		networkAlias: alias
	};
}
