import mysql from "mysql2/promise";

export type QueryValues = readonly unknown[] | undefined;
export type QueryRow = Record<string, unknown>;
export type QueryMutationResult = {
  affectedRows?: number;
  insertId?: number;
};
export type QueryResult = QueryRow[] & QueryMutationResult;

export async function executeQuery({ query, values }: { query: string; values?: QueryValues }): Promise<QueryResult> {
  const db = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT ?? 3306),
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
  });

  try {
    const [results] = await db.execute(query, values);
    if (Array.isArray(results)) {
      return results.map((row) =>
        row && typeof row === "object" && !Array.isArray(row) ? Object.fromEntries(Object.entries(row)) : {}
      );
    }
    const mutationResult: QueryRow[] = [];
    if (results && typeof results === "object") {
      Object.assign(mutationResult, {
        affectedRows: "affectedRows" in results && typeof results.affectedRows === "number" ? results.affectedRows : 0,
        insertId: "insertId" in results && typeof results.insertId === "number" ? results.insertId : 0,
      });
    }
    return mutationResult;
  } catch (error) {
    throw Error(error instanceof Error ? error.message : String(error));
  } finally {
    await db.end();
  }
}
