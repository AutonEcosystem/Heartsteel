import { scoreCollection } from "openrarityjs";
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
import { sendLogs } from "./utils/logging-utils";

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

    console.log(`Initiating download for ${contractAddress}`);

    const metadata = await getContractMetadata(contractAddress);

    if (!metadata) {
      continue;
    }

    rerankMetadata(metadata);

    saveMetadata(metadata).catch((error: any) => {
      sendLogs(error, true);
    });
  }

  setTimeout(() => {
    processQueue();
  }, 100);
}
processQueue();

function rerankMetadata(metadata: TokenMetadata[]): void {
  // Map metadata by token ID
  const mapped: Map<string, TokenMetadata> = new Map();
  metadata.forEach((meta) => {
    mapped.set(meta.tokenID, meta);
  });

  // Iterate through reranked metadata and update rankings
  const reranked = scoreCollection(metadata);

  if (!reranked) {
    return;
  }

  reranked!.forEach((score) => {
    mapped.get(score.tokenID)!.rarityRank = score.rank;
  });
}
