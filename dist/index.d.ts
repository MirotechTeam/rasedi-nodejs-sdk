import { IncomingHttpHeaders } from 'undici/types/header';

declare enum GATEWAY {
    FIB = "FIB",
    ZAIN = "ZAIN",
    ASIA_PAY = "ASIA_PAY",
    FAST_PAY = "FAST_PAY",
    NASS_WALLET = "NASS_WALLET",
    CREDIT_CARD = "CREDIT_CARD"
}
declare enum PAYMENT_STATUS {
    TIMED_OUT = "TIMED_OUT",
    PENDING = "PENDING",
    PAID = "PAID",
    CANCELED = "CANCELED",
    FAILED = "FAILED",
    SETTLED = "SETTLED"
}

interface IHttpResponse<T> {
    body: T;
    headers: IncomingHttpHeaders;
    statusCode: number;
}

interface ICreatePayment {
    /** Price as string, e.g. "1000" */
    amount: string;
    /** List of allowed gateways; empty array means all are allowed */
    gateways: GATEWAY[];
    /** Max 63 characters */
    title: string;
    /** Max 255 characters */
    description: string;
    redirectUrl: string;
    callbackUrl: string;
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
    callbackUrl: string;
    status: PAYMENT_STATUS;
    payoutAmount: string | null;
}
interface ICreatePaymentResponse extends IHttpResponse<ICreatePaymentResponseBody> {
}
interface IPaymentDetailsResponseBody {
    referenceCode: string;
    amount: string;
    paidVia: string | null;
    paidAt: string | null;
    callbackUrl: string;
    status: PAYMENT_STATUS;
    payoutAmount: string | null;
}
interface IPaymentDetailsResponse extends IHttpResponse<IPaymentDetailsResponseBody> {
}
interface ICancelPaymentResponseBody {
    referenceCode: string;
    amount: string;
    paidVia: string | null;
    paidAt: string | null;
    callbackUrl: string;
    status: PAYMENT_STATUS;
    payoutAmount: string | null;
}
interface ICancelPaymentResponse extends IHttpResponse<ICancelPaymentResponseBody> {
}
interface IVerifyPayload {
    keyId: string;
    content: string | undefined;
}
interface IVerifyPaymentResponseBody {
    referenceCode: string;
    status: PAYMENT_STATUS;
    payoutAmount: string | null;
}
interface IVerifyPaymentResponse extends IHttpResponse<IVerifyPaymentResponseBody> {
}

declare class PaymentRestClient {
    private readonly upstreamVersion;
    private readonly dispatcher;
    private readonly authenticator;
    private readonly baseUrl;
    private readonly isTest;
    private publicKeys;
    constructor(key: string, secret: string, baseUrl?: string);
    /**
     * * Basic api call
     */
    private __call;
    /**
     * * Trim base url
     */
    private __trimBaseUrl;
    /**
     *
     */
    private checkIsTest;
    /**
     * * Get public keys
     */
    private getPublicKeys;
    /**
     * * Get payment by id
     */
    getPaymentById(referenceCode: string): Promise<IPaymentDetailsResponse>;
    /**
     * * Create payment
     */
    createPayment(payload: ICreatePayment): Promise<ICreatePaymentResponse>;
    /**
     * * Cancel payment
     */
    cancelPayment(referenceCode: string): Promise<ICancelPaymentResponse>;
    /**
     * * Verify
     */
    verify(payload: IVerifyPayload): Promise<IVerifyPaymentResponse>;
}

export { GATEWAY, type ICancelPaymentResponse, type ICreatePayment, type ICreatePaymentResponse, type IPaymentDetailsResponse, PAYMENT_STATUS, PaymentRestClient as default };
