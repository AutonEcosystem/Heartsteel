import { scoreCollection } from "openrarityjs";
import {
  CONTRACT_METADATA_LIFE,
  MAX_TOKEN_COUNT,
  METADATA_BATCH_SAVE_SIZE,
} from "./constants";
import { getContractMetadata } from "./services/alchemy";
import { getTokenCount } from "./services/gomu";
import {
  isContractSaved,
  readLastUpdated,
  readMetadata,
  saveMetadata,
} from "./storage";
import { TokenMetadata } from "./types";
import { currentTimestampSeconds } from "./utils/date-utils";
import { sendLogs } from "./utils/logging-utils";

let downloadQueue: string[] = [];
const downloading: Set<string> = new Set();
const skipList: Set<String> = new Set();

export async function getMetadata(
  contractAddress: string,
  tokenID: string
): Promise<TokenMetadata | null> {
  // Change to lowercase
  contractAddress = contractAddress.toLowerCase();

  // Get metadata from database if it's already saved
  if (await isContractSaved(contractAddress)) {
    // Check if contract needs to be updated
    const life =
      currentTimestampSeconds() - (await readLastUpdated(contractAddress));
    if (life > CONTRACT_METADATA_LIFE) {
      addToQueue(contractAddress);
    }

    return readMetadata(contractAddress, tokenID);
  }

  // Otherwise, queue collection for saving if it is not already queued
  addToQueue(contractAddress);

  return null;
}

function addToQueue(contractAddress: string) {
  if (
    !downloadQueue.includes(contractAddress) &&
    !skipList.has(contractAddress) &&
    !downloading.has(contractAddress)
  ) {
    downloadQueue.push(contractAddress);
    console.log("Collections in download queue: " + downloadQueue.length);
  }
}

async function processQueue() {
  for (let i = 0; i < downloadQueue.length; i++) {
    const contractAddress = downloadQueue.shift()!;
    downloading.add(contractAddress);

    // First we need to check the token count
    const tokenCount = await getTokenCount(contractAddress);

    if (!tokenCount) {
      downloading.delete(contractAddress);
      continue;
    }

    if (tokenCount > MAX_TOKEN_COUNT) {
      sendLogs(
        `Skipping collection ${contractAddress}: token count exceeds maximum allowed.`,
        false
      );
      skipList.add(contractAddress.toLowerCase());
      downloading.delete(contractAddress);
      continue;
    }

    console.log(`Initiating download for ${contractAddress}`);

    const metadata = await getContractMetadata(contractAddress);

    if (!metadata) {
      downloading.delete(contractAddress);
      continue;
    }

    rerankMetadata(metadata);

    while (metadata.length > 0) {
      const batch = metadata.splice(0, METADATA_BATCH_SAVE_SIZE);

      saveMetadata(batch).catch((error: any) => {
        sendLogs(error, true);
      });
    }
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
