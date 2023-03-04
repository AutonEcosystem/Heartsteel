import { BigNumber } from "alchemy-sdk";
import { TokenMetadata, Trait } from "../types";
import { sendLogs } from "../utils/logging-utils";
import { RequestQueue } from "../utils/request-utils";

const TOKEN_LIMIT = 100;

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY!;

const requestQueue = new RequestQueue(+process.env.ALCHEMY_API_RATE_LIMIT!);

export async function getContractMetadata(
  contractAddress: string
): Promise<TokenMetadata[] | null> {
  const start = Date.now();

  const responses = [];
  try {
    const baseURL = `https://eth-mainnet.g.alchemy.com/nft/v2/${ALCHEMY_API_KEY}/getNFTsForCollection?contractAddress=${contractAddress}&withMetadata=true&limit=${TOKEN_LIMIT}`;
    let response = await requestQueue.queueRequest(baseURL);
    responses.push(await requestQueue.queueRequest(baseURL));

    while (response.nextToken) {
      const url = baseURL + `&startToken=${response.nextToken}`;
      response = await requestQueue.queueRequest(url);
      responses.push(response);
    }
  } catch (error: any) {
    sendLogs(error, true);
    return null;
  }

  let noMetadata = 0;
  const metadata: TokenMetadata[] = [];
  for (const response of responses) {
    response.nfts.forEach((token: any) => {
      if (!token.metadata.attributes) {
        metadata.push({
          contractAddress,
          // Returned as a hex string
          tokenID: BigNumber.from(token.id.tokenId).toString(),
          rarityRank: null,
          traits: [],
        });
        noMetadata++;
        return;
      }

      metadata.push({
        contractAddress,
        // Returned as a hex string
        tokenID: BigNumber.from(token.id.tokenId).toString(),
        rarityRank: token.rank,
        traits: transformTraitArray(token.metadata.attributes),
      });
    });
  }

  const end = Date.now();

  console.log(
    "Found " + metadata.length + " total tokens for " + contractAddress
  );
  console.log("No metadata was found for " + noMetadata + " tokens");
  console.log(end - start + " ms");

  return metadata;
}

function transformTraitArray(traits: any[]): Trait[] {
  const transformed: Trait[] = [];

  // Sometimes traits.forEach does not exist as a function, need to investigate
  if (typeof traits.forEach !== "function") {
    sendLogs(
      `Could not transform trait array, traits object not iterable: ${JSON.stringify(
        traits,
        null,
        2
      )}`,
      true
    );
    return transformed;
  }

  traits.forEach((trait: any) => {
    // Need to check if undefined explicitly because value could be "false" and still be valid
    // but checking !trait.value would return true
    if (trait.trait_type === undefined || trait.value === undefined) {
      sendLogs(
        `Found trait with missing type or value: \n${JSON.stringify(
          trait,
          null,
          2
        )}`,
        true
      );
      return;
    }

    // Also need to convert traits to string as numbers can be returned
    transformed.push({
      type: trait.trait_type.toString(),
      value: trait.value.toString(),
    });
  });

  return transformed;
}
