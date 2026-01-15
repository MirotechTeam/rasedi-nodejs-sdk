import {
  Agent,
  Dispatcher,
  FormData,
  interceptors,
  Pool,
  request,
} from "undici";
import { PrivateKeyAuthenticator } from "../core/auth";
import type { Readable } from "stream";
import {
  ICancelPaymentResponse,
  ICreatePayment,
  ICreatePaymentResponse,
  IPaymentDetailsResponse,
  IPublicKeyResponseBody,
  IPublicKeysResponse,
  IVerifyPayload,
  IVerifyPaymentResponse,
  IVerifyPaymentResponseBody,
} from "./interface/client.interface";
import { apiBaseUrl } from "./const/shared.const";
import { IHttpResponse } from "./interface/shared.interface";
import jwt, { JwtPayload } from "jsonwebtoken";

export class PaymentRestClient {
  private readonly upstreamVersion: number = 1;
  private readonly dispatcher: Dispatcher;
  private readonly authenticator: PrivateKeyAuthenticator;
  private readonly baseUrl: string;
  private readonly isTest: boolean = true;

  private publicKeys: IPublicKeyResponseBody[] = [];

  constructor(key: string, secret: string, baseUrl?: string) {
    this.dispatcher = new Agent({
      connectTimeout: 10 * 1000, // 10 seconds
      factory: (_origin: string, opts: Agent.Options): Dispatcher => {
        return new Pool(_origin, {
          ...opts,
          connections: 5,
          allowH2: true,
          clientTtl: 30 * 1000, // 30 seconds
        });
      },
    }).compose(
      interceptors.dns({ affinity: 4 }),
      interceptors.retry({ maxRetries: 2 }),
      interceptors.cache({
        methods: ["GET", "HEAD", "OPTIONS"],
        cacheByDefault: 5, //seconds
      })
    );

    this.authenticator = new PrivateKeyAuthenticator(key, secret);
    this.isTest = this.checkIsTest(secret);
    this.baseUrl = baseUrl ?? apiBaseUrl;
  }

  // ** ======================== Basic Methods ======================== ** //
  /**
   * * Basic api call
   */
  private async __call<T>(
    path: string,
    verb: Dispatcher.HttpMethod,
    requestBody: string | Buffer | Uint8Array | Readable | null | FormData
  ): Promise<IHttpResponse<T>> {
    const v = `/v${this.upstreamVersion}`;
    const relativeUrl = `${v}/payment/rest/${
      this.isTest ? "test" : "live"
    }${path}`;
    const versionedUrl = `${this.baseUrl}${relativeUrl}`;

    const signature = this.authenticator.makeSignature(verb, relativeUrl);

    const headers = {
      "x-signature": signature,
      "x-id": this.authenticator.keyId,
      "Content-Type": "application/json",
    };

    try {
      const res = await request(versionedUrl, {
        dispatcher: this.dispatcher,
        method: verb,
        body: requestBody,
        headers: headers,
      });

      try {
        const jsonBody = await res.body.json();

        /**
         * * Notice
         * This condition handles request failures gracefully.
         * If the server responds with an error (e.g., 4xx or 5xx),
         * Undici will not throw by default — it returns the error in the response body.
         *
         * To maintain type safety and avoid exposing unexpected error shapes to consumers,
         * we explicitly throw an error when the status code indicates a failure.
         */
        if (res.statusCode > 209 || res.statusCode < 200) {
          throw jsonBody;
        }

        return {
          body: jsonBody as T,
          headers: res.headers,
          statusCode: res.statusCode,
        };
      } catch (parseError) {
        console.error("Failed to parse response JSON:", parseError);
        throw parseError;
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  /**
   * * Trim base url
   */
  private __trimBaseUrl(hostName: string | undefined): string {
    const _https = "https://";
    const _http = "http://";

    // * Parameter host, is optional.
    if (!hostName) return this.baseUrl;

    // * Handle protocol.
    if (!hostName.startsWith(_https)) {
      if (hostName.startsWith(_http)) {
        // * Force https
        hostName = hostName.replace(/^http:\/\//, _https);
      } else hostName = `${_https}${hostName}`;
    }

    // * Handle the ending
    if (hostName.endsWith("/")) {
      return hostName.slice(0, -1); // Slice last `/`.
    }
    return hostName;
  }

  /**
   *
   */
  private checkIsTest(secret: string): boolean {
    return secret.includes("test");
  }

  /**
   * * Get public keys
   */
  private async getPublicKeys(): Promise<IPublicKeysResponse> {
    return this.__call("/get-public-keys", "GET", null);
  }

  // ** ======================== Public Methods ======================= ** //
  /**
   * * Get payment by id
   */
  public async getPaymentById(
    referenceCode: string
  ): Promise<IPaymentDetailsResponse> {
    return this.__call(`/status/${referenceCode}`, "GET", null);
  }

  /**
   * * Create payment
   */
  public async createPayment(
    payload: ICreatePayment
  ): Promise<ICreatePaymentResponse> {
    const jsonPayload = {
      amount: payload.amount,
      gateways: payload.gateways, // already an array, no need to stringify
      title: payload.title,
      description: payload.description,
      redirectUrl: payload.redirectUrl,
      callbackUrl: payload.callbackUrl,
      collectFeeFromCustomer: payload.collectFeeFromCustomer,
      collectCustomerEmail: payload.collectCustomerEmail,
      collectCustomerPhoneNumber: payload.collectCustomerPhoneNumber,
    };

    return this.__call(`/create`, "POST", JSON.stringify(jsonPayload));
  }

  /**
   * * Cancel payment
   */
  public async cancelPayment(
    referenceCode: string
  ): Promise<ICancelPaymentResponse> {
    return this.__call(`/cancel/${referenceCode}`, "PATCH", null);
  }

  /**
   * * Verify
   */
  public async verify(
    payload: IVerifyPayload
  ): Promise<IVerifyPaymentResponse> {
    // * Get the keys if not cached
    if (!this.publicKeys.length) {
      const { body } = await this.getPublicKeys();
      this.publicKeys = body;
    }

    // * Expiration
    let targetKey = this.publicKeys.find((k) => k.id === payload.keyId);
    if (!targetKey) {
      const { body } = await this.getPublicKeys();
      this.publicKeys = body;
      const tempTarget = this.publicKeys.find((k) => k.id === payload.keyId);
      if (!tempTarget) {
        throw new Error("Internal server error");
      }
      targetKey = tempTarget;
    }

    // * Empty content
    if (!payload.content) {
      throw new Error("Internal sever error");
    }

    let _result: string | undefined | JwtPayload;
    jwt.verify(
      payload.content,
      targetKey.key,
      { algorithms: ["ES512"] },
      (err, result) => {
        if (err) {
          throw err;
        }
        _result = result;
      }
    );

    return {
      body: _result as IVerifyPaymentResponseBody,
      headers: {},
      statusCode: 200,
    };
  }
}
