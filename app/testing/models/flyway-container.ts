import dotenv from 'dotenv';
import cwd from 'cwd';
import { GenericContainer, StartedNetwork } from 'testcontainers';
dotenv.config();

export default class FlywayContainer extends GenericContainer {
	constructor() {
		super('redgate/flyway');
	}

	public get volumesDirectory() {
		return `${cwd()}/database`;
	}

	public configure(network: StartedNetwork) {
		const returnedThis = this.withNetwork(network);
		returnedThis.withEnvironment({
			DB_HOST: process.env.NEXT_SERVER_DB_HOST!,
			DB_PORT: process.env.NEXT_SERVER_DB_PORT!,
			DB_NAME: process.env.NEXT_SERVER_DB_NAME!,
			DB_USER: process.env.NEXT_SERVER_DB_USER!,
			DB_PASS: process.env.NEXT_SERVER_DB_PASS!
		});

		returnedThis.withCopyDirectoriesToContainer([
			{
				source: `${this.volumesDirectory}/conf`,
				target: '/flyway/conf'
			},
			{
				source: `${this.volumesDirectory}/migrations`,
				target: '/flyway/sql'
			}
		]);

		returnedThis.withCommand([
			'migrate',
			`-user=${process.env.NEXT_SERVER_DB_USER!}`,
			`-password=${process.env.NEXT_SERVER_DB_PASS}`,
			'-connectRetries=10'
		]);
		return returnedThis;
	}
}
