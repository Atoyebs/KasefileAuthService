import dotenv from 'dotenv';
import cwd from 'cwd';
import {
	AbstractStartedContainer,
	GenericContainer,
	StartedNetwork,
	StartedTestContainer
} from 'testcontainers';
dotenv.config();

const workingDir = '/app/backend';

export default class APIContainer extends GenericContainer {
	constructor() {
		super('node:18');
	}

	public get volumesDirectory() {
		const volumesDirRelative = `${cwd()}`;
		return volumesDirRelative;
	}

	public configure(network: StartedNetwork, ports: { container: number; host: number }) {
		const returnedThis = this.withNetwork(network)
			.withName('api-test')
			.withExposedPorts({
				container: ports.container,
				host: ports.host
			})
			.withWorkingDir(workingDir);

		returnedThis.withCopyDirectoriesToContainer([
			{
				source: `${this.volumesDirectory}/.next`,
				target: `${workingDir}/.next`
			},
			{
				source: `${this.volumesDirectory}/app`,
				target: `${workingDir}/app`
			},
			{
				source: `${this.volumesDirectory}/node_modules`,
				target: `${workingDir}/node_modules`
			},
			{
				source: `${this.volumesDirectory}/public`,
				target: `${workingDir}/public`
			}
		]);

		returnedThis.withCopyFilesToContainer([
			{
				source: `${this.volumesDirectory}/.env`,
				target: `${workingDir}/.env`
			},
			{
				source: `${this.volumesDirectory}/next.config.mjs`,
				target: `${workingDir}/next.config.mjs`
			},
			{
				source: `${this.volumesDirectory}/package-lock.json`,
				target: `${workingDir}/package-lock.json`
			},
			{
				source: `${this.volumesDirectory}/package.json`,
				target: `${workingDir}/package.json`
			},
			{
				source: `${this.volumesDirectory}/next-env.d.ts`,
				target: `${workingDir}/next-env.d.ts`
			},
			{
				source: `${this.volumesDirectory}/tsconfig.json`,
				target: `${workingDir}/tsconfig.json`
			}
		]);

		returnedThis.withCommand(['npm', 'run', 'start']);

		return returnedThis;
	}

	public override async start(): Promise<StartedAPIContainer> {
		return new StartedAPIContainer(await super.start());
	}
}

export class StartedAPIContainer extends AbstractStartedContainer {
	constructor(startedTestContainer: StartedTestContainer) {
		super(startedTestContainer);
	}
}
