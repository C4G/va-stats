import mysql from "mysql2/promise";

export type QueryValues = readonly unknown[] | undefined;

export async function executeQuery({ query, values }: { query: string; values?: QueryValues }): Promise<any> {
  const db = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT ?? 3306),
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
  });

  try {
    const [results] = await db.execute(query, values);
    return results;
  } catch (error) {
    throw Error(error instanceof Error ? error.message : String(error));
  } finally {
    await db.end();
  }
}
