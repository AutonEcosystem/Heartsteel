import { TokenMetadata, Trait } from "../types";
import { sendLogs } from "../utils/logging-utils";
import { RequestQueue } from "../utils/request-utils";

const TOKEN_LIMIT = 100;

const AUTHENTICATION_HEADER = {
  "GOMU-API-KEY": process.env.GOMU_API_KEY,
};

const requestQueue = new RequestQueue(+process.env.GOMU_API_RATE_LIMIT!);

export async function getContractMetadata(
  contractAddress: string
): Promise<TokenMetadata[] | null> {
  const start = Date.now();

  const tokenCount = await getTokenCount(contractAddress);

  if (!tokenCount) {
    return null;
  }

  let responses;
  try {
    const promises: Promise<any>[] = [];

    for (let i = 0; i < tokenCount; i += TOKEN_LIMIT) {
      let url = `https://api.gomu.co/rest/nfts/by-contract?contractAddress=${contractAddress}&includeLastTransfer=false&sortBy=tokenId-asc&cursor=${i}`;
      promises.push(requestQueue.queueRequest(url, AUTHENTICATION_HEADER));
    }

    responses = await Promise.all(promises);
  } catch (error: any) {
    sendLogs(error, true);
    return null;
  }

  const metadata: TokenMetadata[] = [];
  for (const response of responses) {
    response.data.forEach((token: any) => {
      metadata.push({
        contractAddress,
        tokenID: token.tokenId,
        rarityRank: token.rank,
        traits: transformTraitArray(token.metadata.traits),
      });
    });
  }

  const end = Date.now();

  console.log("Found " + metadata.length + " tokens for " + contractAddress);
  console.log(end - start + " ms");

  return metadata;
}

async function getTokenCount(contractAddress: string): Promise<number | null> {
  let response;

  try {
    response = await requestQueue.queueRequest(
      `https://api.gomu.co/rest/overview/contract?contractAddress=${contractAddress}&skipTraits=true`,
      AUTHENTICATION_HEADER
    );
  } catch (error: any) {
    sendLogs(error, true);
  }

  return response ? +response.data.contract.tokensCount : null;
}

function transformTraitArray(traits: any[]): Trait[] {
  const transformed: Trait[] = [];

  traits.forEach((trait: any) => {
    transformed.push({
      type: trait.traitType,
      value: trait.traitValue,
    });
  });

  return transformed;
}
