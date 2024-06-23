import { Client } from 'pg';

class Database {
	private static instance: Database;
	private client?: Client;

	private constructor() {}

	public static async getInstance(): Promise<Database> {
		if (!Database.instance) {
			Database.instance = new Database();
			await Database.instance.connect();
		}
		return Database.instance;
	}

	private async connect() {
		try {
			this.client = new Client({
				connectionString: process.env.NEXT_SERVER_DB_URL
			});
			await this.client.connect();
		} catch (error) {
			throw error;
		}
	}

	public async getClient(): Promise<Client> {
		if (!this.client) {
			await this.connect();
		}
		return this.client!;
	}

	public async close() {
		if (this.client) {
			await this.client.end();
			delete this.client;
		}
	}
}

export default Database;
