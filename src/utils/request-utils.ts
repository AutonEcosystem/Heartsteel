import { HttpsProxyAgent } from "https-proxy-agent";
import fetch from "node-fetch";
import { wait } from "./async-utils";

export async function request(
  url: string,
  headers: any = null,
  proxy: string | null = null,
  formatJSON: boolean = true,
  method: string = "GET",
  body: any = null
) {
  const settings: any = {
    method: method,
  };

  if (headers) {
    settings.headers = headers;
  }

  if (body) {
    settings.body = body;
  }

  if (proxy) {
    const agent = new HttpsProxyAgent(proxy);
    settings.agent = agent;
  }

  return fetch(url, settings)
    .then((res: any) => {
      if (res.status === 200) {
        if (formatJSON) {
          return res.json();
        } else {
          return res.text();
        }
      } else if (res.status === 404) {
        return null;
      } else {
        throw new Error(
          "Request error! URL: " + url + " Status Code: " + res.status
        );
      }
    })
    .catch((error: any) => {
      throw error;
    });
}

type QueuedRequest = {
  requestData: {
    url: string;
    headers: any;
    proxy: string | null;
    formatJSON: boolean;
    method: string;
    body: any;
  };
  response: any;
  error: any;
};

export class RequestQueue {
  private rateLimit: number;
  private counter: number;
  private queue: QueuedRequest[];

  constructor(rateLimit: number) {
    this.rateLimit = rateLimit;
    this.counter = 0;
    this.queue = [];

    this.resetCounter();
    this.processQueue();
  }

  public async queueRequest(
    url: string,
    headers: any = null,
    proxy: string | null = null,
    formatJSON: boolean = true,
    method: string = "GET",
    body: any = null
  ): Promise<any> {
    const queuedRequest: QueuedRequest = {
      requestData: {
        url: url,
        headers: headers,
        proxy: proxy,
        formatJSON: formatJSON,
        method: method,
        body: body,
      },
      response: undefined,
      error: undefined,
    };

    // If rate limit is not exceeded, execute right away
    if (this.counter < this.rateLimit) {
      this.request(queuedRequest);
    }
    // Otherwise, queue it
    else {
      this.queue.push(queuedRequest);
    }

    // Wait till request is processed
    while (
      queuedRequest.response === undefined &&
      queuedRequest.error === undefined
    ) {
      await wait(25);
    }

    // If error was thrown from the request, pass it to its respective handler
    if (queuedRequest.error) {
      throw queuedRequest.error;
    }

    return queuedRequest.response;
  }

  private request(queuedRequest: QueuedRequest) {
    this.counter++;

    const { url, headers, proxy, formatJSON, method, body } =
      queuedRequest.requestData;

    request(url, headers, proxy, formatJSON, method, body)
      .then((response: any) => {
        queuedRequest.response = response;
      })
      // We need to catch the error and throw it in queueRequest because here it can interrupt the periodic processQueue
      // function
      .catch((error: any) => {
        queuedRequest.error = error;
      });
  }

  private resetCounter() {
    this.counter = 0;

    setTimeout(() => {
      this.resetCounter();
    }, 1000);
  }

  private processQueue() {
    for (
      let i = this.counter;
      i <= this.rateLimit && this.queue.length > 0;
      i++
    ) {
      const queuedRequest = this.queue.shift()!;
      this.request(queuedRequest);
    }

    setTimeout(() => {
      this.processQueue();
    }, 1000);
  }
}
