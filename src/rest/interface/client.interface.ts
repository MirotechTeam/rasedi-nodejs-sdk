import { GATEWAY, PAYMENT_STATUS } from "../enum/shared.enum";
import { IHttpResponse } from "./shared.interface";

// ** ======================== Create Payment ======================= ** //
export interface ICreatePayment {
  /** Price as string, e.g. "1000" */
  amount: string;

  /** List of allowed gateways; empty array means all are allowed */
  gateways: GATEWAY[];

  /** Max 63 characters */
  title: string;

  /** Max 255 characters */
  description: string;

  redirectUrl: string;
  collectFeeFromCustomer: boolean;
  collectCustomerEmail: boolean;
  collectCustomerPhoneNumber: boolean;

  allowPromoCode: boolean;
}

interface ICreatePaymentResponseBody {
  referenceCode: string;
  amount: string;
  paidVia: string | null;
  paidAt: string | null;
  redirectUrl: string;
  status: PAYMENT_STATUS;
  payoutAmount: string | null;
}

export interface ICreatePaymentResponse extends IHttpResponse<ICreatePaymentResponseBody> {}

// ** ========================= Get Payment ========================= ** //
interface IPaymentDetailsResponseBody {
  referenceCode: string;
  amount: string;
  paidVia: string | null;
  paidAt: string | null;
  callbackUrl: string;
  status: PAYMENT_STATUS;
  payoutAmount: string | null;
}

export interface IPaymentDetailsResponse extends IHttpResponse<IPaymentDetailsResponseBody> {}

// ** ======================== Cancel Payment ======================= ** //
interface ICancelPaymentResponseBody {
  referenceCode: string;
  amount: string;
  paidVia: string | null;
  paidAt: string | null;
  callbackUrl: string;
  status: PAYMENT_STATUS;
  payoutAmount: string | null;
}

export interface ICancelPaymentResponse extends IHttpResponse<ICancelPaymentResponseBody> {}

// ** ========================= Get Api Keys ======================== ** //
export interface IPublicKeyResponseBody {
  id: string;
  key: string;
}

export interface IPublicKeysResponse extends IHttpResponse<
  IPublicKeyResponseBody[]
> {}

// ** ============================ Verify =========================== ** //
export interface IVerifyPayload {
  keyId: string;
  content: string | undefined;
}

export interface IVerifyPaymentResponseBody {
  referenceCode: string;

  status: PAYMENT_STATUS;

  payoutAmount: string | null;
}

export interface IVerifyPaymentResponse extends IHttpResponse<IVerifyPaymentResponseBody> {}
