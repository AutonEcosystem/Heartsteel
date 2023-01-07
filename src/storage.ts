import { MySQLPool } from "./utils/mysql-utils";

let pool: MySQLPool;

export function setupMySQL(
  host: string,
  port: number,
  database: string,
  username: string,
  password: string
) {
  pool = new MySQLPool(host, port, database, username, password);
}
