import Database from '@/app/db';

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
