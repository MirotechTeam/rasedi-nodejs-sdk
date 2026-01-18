"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === "object") || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (
  (target = mod != null ? __create(__getProtoOf(mod)) : {}),
  __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule
      ? __defProp(target, "default", { value: mod, enumerable: true })
      : target,
    mod
  )
);
var __toCommonJS = (mod) =>
  __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  GATEWAY: () => GATEWAY,
  PAYMENT_STATUS: () => PAYMENT_STATUS,
  default: () => index_default,
});
module.exports = __toCommonJS(index_exports);

// src/rest/client.ts
var import_undici = require("undici");

// src/core/auth.ts
var import_node_crypto = require("crypto");
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
    const signResult = (0, import_node_crypto.sign)(null, bufSign, {
      key: this.encryptedPvKey,
      passphrase: "",
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
var apiBaseUrl = "https://api.rasedi.com";

// src/rest/client.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
var PaymentRestClient = class {
  upstreamVersion = 1;
  dispatcher;
  authenticator;
  baseUrl;
  isTest = true;
  publicKeys = [];
  constructor(key, secret, baseUrl) {
    this.dispatcher = new import_undici.Agent({
      connectTimeout: 10 * 1e3,
      // 10 seconds
      factory: (_origin, opts) => {
        return new import_undici.Pool(_origin, {
          ...opts,
          connections: 5,
          allowH2: true,
          clientTtl: 30 * 1e3,
          // 30 seconds
        });
      },
    }).compose(
      import_undici.interceptors.dns({ affinity: 4 }),
      import_undici.interceptors.retry({ maxRetries: 2 }),
      import_undici.interceptors.cache({
        methods: ["GET", "HEAD", "OPTIONS"],
        cacheByDefault: 5,
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
      const res = await (0, import_undici.request)(versionedUrl, {
        dispatcher: this.dispatcher,
        method: verb,
        body: requestBody,
        headers,
      });
      try {
        const jsonBody = await res.body.json();
        if (res.statusCode > 209 || res.statusCode < 200) {
          throw jsonBody;
        }
        return {
          body: jsonBody,
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
      collectCustomerPhoneNumber: payload.collectCustomerPhoneNumber,
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
    import_jsonwebtoken.default.verify(
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
      statusCode: 200,
    };
  }
};

// src/rest/enum/shared.enum.ts
var GATEWAY = /* @__PURE__ */ ((GATEWAY2) => {
  GATEWAY2["FIB"] = "FIB";
  GATEWAY2["ZAIN"] = "ZAIN";
  GATEWAY2["ASIA_PAY"] = "ASIA_PAY";
  GATEWAY2["FAST_PAY"] = "FAST_PAY";
  GATEWAY2["NASS_WALLET"] = "NASS_WALLET";
  GATEWAY2["CREDIT_CARD"] = "CREDIT_CARD";
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
// Annotate the CommonJS export names for ESM import in node:
0 &&
  (module.exports = {
    GATEWAY,
    PAYMENT_STATUS,
  });
