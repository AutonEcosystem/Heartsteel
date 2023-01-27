import { TokenMetadata } from "./types";
import { currentTimestampSeconds } from "./utils/date-utils";
import { MySQLPool } from "./utils/mysql-utils";

const TOKEN_METADATA_TABLE_NAME = "token_metadata";
const TOKEN_METADATA_TABLE_SIGNATURE = `contract_address VARCHAR(255) NOT NULL,
token_id VARCHAR(255) NOT NULL,
rarity_rank INT NULL,
traits TEXT NOT NULL,
last_updated INT NOT NULL,
UNIQUE KEY idx_nft_id (contract_address, token_id),
KEY idx_last_updated (last_updated) USING BTREE,
FULLTEXT KEY (traits)`;

let pool: MySQLPool;

export async function setupMySQL(
  host: string,
  port: number,
  database: string,
  username: string,
  password: string,
  connectionLimit: number
): Promise<void> {
  pool = new MySQLPool(
    host,
    port,
    database,
    username,
    password,
    connectionLimit,
    "utf8mb4"
  );
  await setupTables();
}

async function setupTables(): Promise<void> {
  // Token Metadata
  await pool.query(
    `CREATE TABLE IF NOT EXISTS ${TOKEN_METADATA_TABLE_NAME} (${TOKEN_METADATA_TABLE_SIGNATURE}) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
}

export async function isContractSaved(contractAddress: string) {
  return pool.hasRow(TOKEN_METADATA_TABLE_NAME, {
    contract_address: contractAddress.toLowerCase(),
  });
}

export async function saveMetadata(metadata: TokenMetadata[]): Promise<void> {
  const timestampSeconds = currentTimestampSeconds();

  const toSave: object[] = [];
  for (const token of metadata) {
    toSave.push({
      contract_address: token.contractAddress.toLowerCase(),
      token_id: token.tokenID,
      rarity_rank: token.rarityRank,
      traits: JSON.stringify(token.traits),
      last_updated: timestampSeconds,
    });
  }

  // Need to replace old metadata if it exists, so we pass true for the 3rd parameter
  await pool.writeValues(TOKEN_METADATA_TABLE_NAME, toSave, true);
}

export async function readMetadata(
  contractAddress: string,
  tokenID: string
): Promise<TokenMetadata | null> {
  const result = await pool.readValues(
    TOKEN_METADATA_TABLE_NAME,
    {
      contract_address: contractAddress.toLowerCase(),
      token_id: tokenID,
    },
    ["*"]
  );

  if (!result) {
    return null;
  }

  const metadata = result[0];

  return {
    contractAddress: metadata.contract_address,
    tokenID: metadata.token_id,
    rarityRank: metadata.rarity_rank,
    traits: JSON.parse(metadata.traits),
  };
}

export async function readLastUpdated(
  contractAddress: string
): Promise<number> {
  const result = (
    await pool.readValues(
      TOKEN_METADATA_TABLE_NAME,
      {
        contract_address: contractAddress,
      },
      ["last_updated"],
      1
    )
  )[0];

  return result.last_updated;
}
