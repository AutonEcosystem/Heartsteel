import * as dotenv from "dotenv";
import { startServer } from "./server";
import { setupMySQL } from "./storage";

// Load .env before running the app or importing any other files
dotenv.config();

// Make sure all environment values are set
const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_DATABASE,
  MYSQL_USERNAME,
  MYSQL_PASSWORD,
} = process.env;

if (
  !MYSQL_HOST ||
  !MYSQL_PORT ||
  isNaN(+MYSQL_PORT) ||
  !MYSQL_DATABASE ||
  !MYSQL_USERNAME ||
  !MYSQL_PASSWORD
) {
  throw new Error("Some environment variables are not set properly");
}

setupMySQL(
  MYSQL_HOST,
  +MYSQL_PORT,
  MYSQL_DATABASE,
  MYSQL_USERNAME,
  MYSQL_PASSWORD
);
startServer();
