import { CONTRACT_METADATA_LIFE } from "./constants";
import { getContractMetadata } from "./services/gomu";
import {
  isTokenSaved,
  readLastUpdated,
  readMetadata,
  saveMetadata,
} from "./storage";
import { TokenMetadata } from "./types";
import { currentTimestampSeconds } from "./utils/date-utils";

let downloadQueue: string[] = [];

export async function getMetadata(
  contractAddress: string,
  tokenID: string
): Promise<TokenMetadata | null> {
  // Get metadata from database if it's already saved
  if (await isTokenSaved(contractAddress, tokenID)) {
    // Check if contract needs to be updated
    const life =
      currentTimestampSeconds() - (await readLastUpdated(contractAddress));
    if (life > CONTRACT_METADATA_LIFE) {
      downloadQueue.push(contractAddress);
    }

    return readMetadata(contractAddress, tokenID);
  }

  // Otherwise, queue collection for saving if it is not already queued
  if (!downloadQueue.includes(contractAddress)) {
    downloadQueue.push(contractAddress);
    console.log("Collections in download queue: " + downloadQueue.length);
  }

  return null;
}

async function processQueue() {
  for (let i = 0; i < downloadQueue.length; i++) {
    const contractAddress = downloadQueue.shift()!;
    const metadata = await getContractMetadata(contractAddress);

    if (!metadata) {
      continue;
    }

    await saveMetadata(metadata);
  }

  setTimeout(() => {
    processQueue();
  }, 100);
}
processQueue();
