import * as mysql from "mysql";

export class MySQLPool {
  pool: mysql.Pool;

  constructor(
    host: string,
    port: number,
    database: string,
    username: string,
    password: string,
    charset?: string
  ) {
    this.pool = mysql.createPool({
      connectionLimit: 1_000,
      host: host,
      port: port,
      database: database,
      user: username,
      password: password,
      charset,
    });
  }

  public async query(statement: string, values?: any[][]): Promise<any> {
    return new Promise<any | void>((resolve, reject) => {
      if (values) {
        this.pool.query(statement, [values], (err: any, results: any) => {
          if (err) {
            reject(err);
          }

          return results ? resolve(results) : resolve(null);
        });
      } else {
        this.pool.query(statement, (err: any, results: any) => {
          if (err) {
            reject(err);
          }

          if (results) {
            if (results.length === 0) {
              resolve(null);
            }

            resolve(results);
          }

          // If no return values, call void
          resolve(null);
        });
      }
    });
  }

  public async createTableIfNotExists(
    tableName: string,
    columnNames: string[],
    dataTypes: string[]
  ) {
    if (columnNames.length !== dataTypes.length) {
      throw `Failed to create table '${tableName}': columnNames and dataTypes are not the same length.`;
    }

    const zipped: string[] = [];
    for (let i = 0; i < columnNames.length; i++) {
      zipped[i] = columnNames[i] + " " + dataTypes[i];
    }

    await this.query(
      `CREATE TABLE IF NOT EXISTS ${tableName} (${zipped.join(", ")});`
    );
  }

  public async writeValues(
    tableName: string,
    objects: { [index: string]: any }[],
    replace: boolean = false
  ) {
    if (objects.length < 1) {
      throw `Failed to write values into ${tableName}: objects array must include at least 1 item.`;
    }

    // Grab column list
    const columns: string[] = Object.keys(objects[0]);

    const statement = `${
      replace ? "REPLACE" : "INSERT"
    } INTO ${tableName} (${columns.join(", ")}) VALUES ?;`;

    const values: any[][] = [];
    for (const obj of objects) {
      values.push(Object.values(obj));
    }

    await this.query(statement, values);
  }

  public async deleteValues(tableName: string, filter: object): Promise<void> {
    const conditions: string[] = [];
    for (const entry of Object.entries(filter)) {
      // Wrap value in single quotes if it's a string
      if (typeof entry[1] === "string") {
        conditions.push(`${entry[0]}='${entry[1].replaceAll("'", "''")}'`);
      } else {
        conditions.push(`${entry[0]}=${entry[1]}`);
      }
    }

    const conditionsCombined = conditions.join(" AND ");

    this.query(`DELETE FROM ${tableName} WHERE ${conditionsCombined};`);
  }

  public async readValues(
    tableName: string,
    filter: object,
    columns: string[],
    limit?: number
  ) {
    const conditions: string[] = [];
    for (const entry of Object.entries(filter)) {
      // Escape single quotes
      if (typeof entry[1] === "string") {
        entry[1] = entry[1].replaceAll("'", "''");
      }

      // Wrap value in single quotes if it's a string
      if (typeof entry[1] === "string") {
        conditions.push(`${entry[0]}='${entry[1]}'`);
      } else {
        conditions.push(`${entry[0]}=${entry[1]}`);
      }
    }

    const conditionsCombined = conditions.join(" AND ");

    let statement = `SELECT ${columns.join(
      ", "
    )} FROM ${tableName} WHERE ${conditionsCombined}`;

    if (limit) {
      statement = statement + ` LIMIT ${limit}`;
    }

    statement = statement + ";";

    return this.query(statement);
  }

  public async hasRow(tableName: string, filter: object): Promise<boolean> {
    return (await this.readValues(tableName, filter, ["*"], 1)) ? true : false;
  }
}
