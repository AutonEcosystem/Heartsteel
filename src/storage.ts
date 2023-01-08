import { TokenMetadata } from "./types";
import { currentTimestampSeconds } from "./utils/date-utils";
import { MySQLPool } from "./utils/mysql-utils";

const TOKEN_METADATA_TABLE_NAME = "token_metadata";
const TOKEN_METADATA_TABLE_SIGNATURE = `contract_address VARCHAR(255) NOT NULL,
token_id VARCHAR(255) NOT NULL,
rarity_rank INT NOT NULL,
traits TEXT NOT NULL,
last_updated INT NOT NULL,
UNIQUE KEY idx_nft_id (contract_address, token_id),
KEY idx_last_updated (last_updated) USING BTREE,
FULLTEXT KEY (traits)`;

const TABLE_SIGNATURES: { [index: string]: string } = {
  [TOKEN_METADATA_TABLE_NAME]: TOKEN_METADATA_TABLE_SIGNATURE,
};

let pool: MySQLPool;

export async function setupMySQL(
  host: string,
  port: number,
  database: string,
  username: string,
  password: string
): Promise<void> {
  pool = new MySQLPool(host, port, database, username, password);
  await setupTables();
}

async function setupTables(): Promise<void> {
  for (const tableName in TABLE_SIGNATURES) {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS ${tableName} (${TABLE_SIGNATURES[tableName]});`
    );
  }
}

export async function isContractSaved(contractAddress: string) {
  return pool.hasRow(TOKEN_METADATA_TABLE_NAME, {
    contract_address: contractAddress,
  });
}

export async function saveMetadata(metadata: TokenMetadata[]): Promise<void> {
  const timestampSeconds = currentTimestampSeconds();

  const toSave: object[] = [];
  for (const token of metadata) {
    toSave.push({
      contract_address: token.contractAddress,
      token_id: token.tokenID,
      rarity_rank: token.rarityRank,
      traits: JSON.stringify(token.traits),
      last_updated: timestampSeconds,
    });
  }

  await pool.writeValues(TOKEN_METADATA_TABLE_NAME, toSave);
}
