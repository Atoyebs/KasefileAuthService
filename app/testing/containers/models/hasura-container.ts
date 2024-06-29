import dotenv from 'dotenv';
import cwd from 'cwd';
import {
	AbstractStartedContainer,
	GenericContainer,
	StartedNetwork,
	StartedTestContainer
} from 'testcontainers';
dotenv.config();

export default class HasuraContainer extends GenericContainer {
	constructor() {
		super('hasura/graphql-engine:v2.40.1.cli-migrations-v3');
	}

	public get volumesDirectory() {
		const volumesDirRelative = `${cwd()}/app/testing/containers/volumes`;
		return volumesDirRelative;
	}

	public configure(
		network: StartedNetwork,
		ports: { container: number; host: number },
		shouldMigrate: boolean = true
	) {
		const returnedThis = this.withNetwork(network).withName('hasura-test').withExposedPorts({
			container: ports.container,
			host: ports.host
		});

		if (shouldMigrate) {
			// eslint-disable-next-line no-console

			returnedThis.withCopyDirectoriesToContainer([
				{
					source: `${this.volumesDirectory}/hasura/metadata`,
					target: '/hasura-metadata'
				},
				{
					source: `${this.volumesDirectory}/hasura/migrations`,
					target: '/hasura-migrations'
				}
			]);
		}

		return returnedThis;
	}

	public override async start(): Promise<StartedHasuraContainer> {
		return new StartedHasuraContainer(await super.start());
	}
}

export class StartedHasuraContainer extends AbstractStartedContainer {
	constructor(startedTestContainer: StartedTestContainer) {
		super(startedTestContainer);
	}
}
