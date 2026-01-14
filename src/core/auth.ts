import { sign } from "node:crypto";
import type { IAuthenticator } from "./interface/authenticator.interface";
import type { Dispatcher } from "undici";

export class PrivateKeyAuthenticator implements IAuthenticator {
  // ** ========================= Constructor ========================= ** //
  constructor(
    private _encryptedPvKey: string,
    private _secret: string,
  ) {
    this._encryptedPvKey = _encryptedPvKey;
    this._secret = _secret;
  }

  // ** =========================== Methods =========================== ** //
  public makeSignature(
    method: Dispatcher.HttpMethod,
    relativeUrl: string,
  ): string {
    const rawSign = `${method} || ${this.secret} || ${relativeUrl}`;
    const bufSign = Buffer.from(rawSign, "utf-8");

    const signResult = sign(null, bufSign, {
      key: this.encryptedPvKey,
      passphrase: "",
    });

    return signResult.toString("base64");
  }

  public get keyId(): string {
    return this._secret;
  }

  // ** ====================== Getters / Setters ====================== ** //
  public get secret(): string {
    return this._secret;
  }
  public set secret(value: string) {
    this._secret = value;
  }

  public get encryptedPvKey(): string {
    return this._encryptedPvKey;
  }
  public set encryptedPvKey(value: string) {
    this._encryptedPvKey = value;
  }
}
