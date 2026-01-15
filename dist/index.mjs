// src/rest/client.ts
import {
  Agent,
  interceptors,
  Pool,
  request
} from "undici";

// src/core/auth.ts
import { sign } from "crypto";
var PrivateKeyAuthenticator = class {
  // ** ========================= Constructor ========================= ** //
  constructor(_encryptedPvKey, _secret) {
    this._encryptedPvKey = _encryptedPvKey;
    this._secret = _secret;
    this._encryptedPvKey = _encryptedPvKey;
    this._secret = _secret;
  }
  // ** =========================== Methods =========================== ** //
  makeSignature(method, relativeUrl) {
    const rawSign = `${method} || ${this.secret} || ${relativeUrl}`;
    const bufSign = Buffer.from(rawSign, "utf-8");
    const signResult = sign(null, bufSign, {
      key: this.encryptedPvKey,
      passphrase: ""
    });
    return signResult.toString("base64");
  }
  get keyId() {
    return this._secret;
  }
  // ** ====================== Getters / Setters ====================== ** //
  get secret() {
    return this._secret;
  }
  set secret(value) {
    this._secret = value;
  }
  get encryptedPvKey() {
    return this._encryptedPvKey;
  }
  set encryptedPvKey(value) {
    this._encryptedPvKey = value;
  }
};

// src/rest/const/shared.const.ts
var apiBaseUrl = "https://api.pallawan.com";

// src/rest/client.ts
import jwt from "jsonwebtoken";
var PaymentRestClient = class {
  upstreamVersion = 1;
  dispatcher;
  authenticator;
  baseUrl;
  isTest = true;
  publicKeys = [];
  constructor(key, secret, baseUrl) {
    this.dispatcher = new Agent({
      connectTimeout: 10 * 1e3,
      // 10 seconds
      factory: (_origin, opts) => {
        return new Pool(_origin, {
          ...opts,
          connections: 5,
          allowH2: true,
          clientTtl: 30 * 1e3
          // 30 seconds
        });
      }
    }).compose(
      interceptors.dns({ affinity: 4 }),
      interceptors.retry({ maxRetries: 2 }),
      interceptors.cache({
        methods: ["GET", "HEAD", "OPTIONS"],
        cacheByDefault: 5
        //seconds
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
  async __call(path, verb, requestBody) {
    const v = `/v${this.upstreamVersion}`;
    const relativeUrl = `${v}/payment/rest/${this.isTest ? "test" : "live"}${path}`;
    const versionedUrl = `${this.baseUrl}${relativeUrl}`;
    const signature = this.authenticator.makeSignature(verb, relativeUrl);
    const headers = {
      "x-signature": signature,
      "x-id": this.authenticator.keyId,
      "Content-Type": "application/json"
    };
    try {
      const res = await request(versionedUrl, {
        dispatcher: this.dispatcher,
        method: verb,
        body: requestBody,
        headers
      });
      try {
        const jsonBody = await res.body.json();
        if (res.statusCode > 209 || res.statusCode < 200) {
          throw jsonBody;
        }
        return {
          body: jsonBody,
          headers: res.headers,
          statusCode: res.statusCode
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
  __trimBaseUrl(hostName) {
    const _https = "https://";
    const _http = "http://";
    if (!hostName) return this.baseUrl;
    if (!hostName.startsWith(_https)) {
      if (hostName.startsWith(_http)) {
        hostName = hostName.replace(/^http:\/\//, _https);
      } else hostName = `${_https}${hostName}`;
    }
    if (hostName.endsWith("/")) {
      return hostName.slice(0, -1);
    }
    return hostName;
  }
  /**
   *
   */
  checkIsTest(secret) {
    return secret.includes("test");
  }
  /**
   * * Get public keys
   */
  async getPublicKeys() {
    return this.__call("/get-public-keys", "GET", null);
  }
  // ** ======================== Public Methods ======================= ** //
  /**
   * * Get payment by id
   */
  async getPaymentById(referenceCode) {
    return this.__call(`/status/${referenceCode}`, "GET", null);
  }
  /**
   * * Create payment
   */
  async createPayment(payload) {
    const jsonPayload = {
      amount: payload.amount,
      gateways: payload.gateways,
      // already an array, no need to stringify
      title: payload.title,
      description: payload.description,
      redirectUrl: payload.redirectUrl,
      callbackUrl: payload.callbackUrl,
      collectFeeFromCustomer: payload.collectFeeFromCustomer,
      collectCustomerEmail: payload.collectCustomerEmail,
      collectCustomerPhoneNumber: payload.collectCustomerPhoneNumber
    };
    return this.__call(`/create`, "POST", JSON.stringify(jsonPayload));
  }
  /**
   * * Cancel payment
   */
  async cancelPayment(referenceCode) {
    return this.__call(`/cancel/${referenceCode}`, "PATCH", null);
  }
  /**
   * * Verify
   */
  async verify(payload) {
    if (!this.publicKeys.length) {
      const { body } = await this.getPublicKeys();
      this.publicKeys = body;
    }
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
    if (!payload.content) {
      throw new Error("Internal sever error");
    }
    let _result;
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
      body: _result,
      headers: {},
      statusCode: 200
    };
  }
};

// src/rest/enum/shared.enum.ts
var GATEWAY = /* @__PURE__ */ ((GATEWAY2) => {
  GATEWAY2["FIB"] = "FIB";
  GATEWAY2["ZAIN"] = "ZAIN";
  GATEWAY2["ASIA_PAY"] = "ASIA_PAY";
  GATEWAY2["FAST_PAY"] = "FAST_PAY";
  GATEWAY2["SUPER_QI"] = "SUPER_QI";
  GATEWAY2["NASS_WALLET"] = "NASS_WALLET";
  GATEWAY2["YANA"] = "YANA";
  return GATEWAY2;
})(GATEWAY || {});
var PAYMENT_STATUS = /* @__PURE__ */ ((PAYMENT_STATUS2) => {
  PAYMENT_STATUS2["TIMED_OUT"] = "TIMED_OUT";
  PAYMENT_STATUS2["PENDING"] = "PENDING";
  PAYMENT_STATUS2["PAID"] = "PAID";
  PAYMENT_STATUS2["CANCELED"] = "CANCELED";
  PAYMENT_STATUS2["FAILED"] = "FAILED";
  PAYMENT_STATUS2["SETTLED"] = "SETTLED";
  return PAYMENT_STATUS2;
})(PAYMENT_STATUS || {});

// src/index.ts
var index_default = PaymentRestClient;
export {
  GATEWAY,
  PAYMENT_STATUS,
  index_default as default
};
