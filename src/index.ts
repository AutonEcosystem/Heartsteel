import * as dotenv from "dotenv";

// Load .env before running the app or importing any other files
dotenv.config();

// Make sure all environment values are set
const {
  PORT,
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_DATABASE,
  MYSQL_USERNAME,
  MYSQL_PASSWORD,
  GOMU_API_KEY,
  GOMU_API_RATE_LIMIT,
} = process.env;

if (
  !PORT ||
  isNaN(+PORT) ||
  !MYSQL_HOST ||
  !MYSQL_PORT ||
  isNaN(+MYSQL_PORT) ||
  !MYSQL_DATABASE ||
  !MYSQL_USERNAME ||
  !MYSQL_PASSWORD ||
  !GOMU_API_KEY ||
  !GOMU_API_RATE_LIMIT ||
  isNaN(+GOMU_API_RATE_LIMIT)
) {
  throw new Error(
    "Some environment variables are not set properly. See .env.example"
  );
}

import { startServer } from "./server";
import { setupMySQL } from "./storage";

async function start(): Promise<void> {
  await setupMySQL(
    MYSQL_HOST!,
    +MYSQL_PORT!,
    MYSQL_DATABASE!,
    MYSQL_USERNAME!,
    MYSQL_PASSWORD!
  );
  startServer();
}
start();
