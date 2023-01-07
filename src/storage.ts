import { MySQLPool } from "./utils/mysql-utils";

let pool: MySQLPool;

export function setupMySQL(host: string, username: string, password: string) {
  pool = new MySQLPool(host, username, password);
}
