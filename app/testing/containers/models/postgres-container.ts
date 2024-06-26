import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import _ from 'lodash';
import dotenv from 'dotenv';
import { StartedNetwork } from 'testcontainers';
dotenv.config();

const customAlias = 'pg';

export default class PostgresContainer extends PostgreSqlContainer {
	databaseName: string = '';
	databaseUser: string = '';
	databasePass: string = '';
	databasePort: number = 5432;

	public configure(
		network: StartedNetwork,
		params?: { user: string; pass: string; dbName: string; port: number }
	) {
		const port = _.isEmpty(params?.port)
			? parseInt(`${process.env.NEXT_SERVER_DB_PORT!}`)
			: params!.port;
		const user = _.isEmpty(params?.user) ? process.env.NEXT_SERVER_DB_USER! : params!.user;
		const password = _.isEmpty(params?.pass) ? process.env.NEXT_SERVER_DB_PASS! : params!.pass;
		const name = _.isEmpty(params?.dbName) ? process.env.NEXT_SERVER_DB_NAME! : params!.dbName;

		this.databaseName = name;
		this.databaseUser = user;
		this.databasePass = password;
		this.databasePort = port;

		return this.withUsername(user)
			.withPassword(password)
			.withDatabase(name)
			.withName(customAlias)
			.withExposedPorts({ container: 5432, host: port })
			.withNetworkAliases(customAlias)
			.withNetwork(network);
	}

	public override async start(): Promise<StartedPGContainer> {
		return new StartedPGContainer(
			await super.start(),
			this.databaseName,
			this.databaseUser,
			this.databasePass
		);
	}
}

export class StartedPGContainer extends StartedPostgreSqlContainer {
	/**
	 * Retrieves the internal network database URI.
	 *
	 * @return {string} The internal database URI that **other containers can use to connect to**.
	 */
	public get internalNetworkDbUri(): string {
		const internalUri = this.getConnectionUri().replace(/localhost/g, customAlias);
		return internalUri;
	}
}
