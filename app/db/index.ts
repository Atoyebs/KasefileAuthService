/* eslint-disable no-console */
import { ClientConfig, Pool } from 'pg';
import _ from 'lodash';

class Database {
	private pool: Pool;
	private config: ClientConfig;

	constructor(config?: ClientConfig) {
		try {
			if (_.isEmpty(config)) {
				this.config = {
					user: process.env.NEXT_SERVER_DB_USER,
					password: process.env.NEXT_SERVER_DB_PASS,
					host: process.env.NEXT_SERVER_DB_HOST,
					port: Number(process.env.NEXT_SERVER_DB_PORT),
					database: process.env.NEXT_SERVER_DB_NAME,
					keepAlive: true
				};
				this.pool = new Pool(this.config);
			} else {
				this.config = config;
				this.pool = new Pool({ ...config, keepAlive: true });
			}
		} catch (error) {
			console.error(`DB Error: `, error);
			throw error;
		}
	}

	private getPgPool() {
		if (!this.pool) {
			return new Pool(this.config);
		}
		return this.pool;
	}

	async connect() {
		try {
			const aPool = this.getPgPool();
			return await aPool.connect();
		} catch (error) {
			console.error(`DB (connect) Error: `, error);
			throw error;
		}
	}
}

export default Database;
