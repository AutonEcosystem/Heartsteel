import { sendLogs } from "../utils/logging-utils";
import { RequestQueue } from "../utils/request-utils";

const AUTHENTICATION_HEADER = {
  "GOMU-API-KEY": process.env.GOMU_API_KEY,
};

const requestQueue = new RequestQueue(+process.env.GOMU_API_RATE_LIMIT!);

export async function getTokenCount(
  contractAddress: string
): Promise<number | null> {
  let response;

  try {
    response = await requestQueue.queueRequest(
      `https://api.gomu.co/rest/overview/contract?contractAddress=${contractAddress}&skipTraits=true`,
      AUTHENTICATION_HEADER
    );
  } catch (error: any) {
    sendLogs(error, true);
  }

  return response && response.data && response.data.contract
    ? +response.data.contract.tokensCount
    : null;
}
