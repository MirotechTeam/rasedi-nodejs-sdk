# Rasedi Node.js SDK

## Overview
A lightweight Node.js client for the Rasedi payment gateway. It wraps the REST endpoints exposed by the platform, handling request signing, retry logic, and typed responses for all payment-related flows.

## Installation

### Release version
```bash
npm install rasedi-sdk
```

### Build from source
```bash
git clone <repo>
npm install
npm run build
```

The package publishes both CommonJS (`dist/index.js`) and ESM (`dist/index.mjs`) bundles, plus declaration files (`dist/index.d.ts`).

## Usage

### Creating a client instance
You must provide the PEM-encoded private key and the matching secret (used as key id in headers). The SDK automatically detects whether you are targeting the test or live environments based on the secret.

```ts
import PaymentRestClient, { GATEWAY, PAYMENT_STATUS } from "rasedi-sdk";

const client = new PaymentRestClient(process.env.PV_KEY!, process.env.SECRET!);

const payment = await client.createPayment({
  amount: "1000",
  title: "Order #1234",
  description: "Description shown to the customer",
  gateways: [GATEWAY.ZAIN],
  redirectUrl: "https://your-app.com/confirmation",
  callbackUrl: "https://your-app.com/webhook",
  collectFeeFromCustomer: false,
  collectCustomerEmail: false,
  collectCustomerPhoneNumber: false,
  allowPromoCode: false,
});

const status = await client.getPaymentById(payment.body.referenceCode);

if (status.body.status === PAYMENT_STATUS.PAID) {
  // Fulfill the order...
}
```

### Canceling or verifying payments
```ts
await client.cancelPayment(referenceCode);
await client.verify({ keyId: payload.keyId, content: payload.content });
```
`verify` fetches the public keys once and caches them in memory. It expects the signature payload issued by Rasedi and throws if verification fails.

## Configuration

| Key | Description |
| --- | ----------- |
| `PV_KEY` | PEM-encoded private key used for signing requests. |
| `SECRET` | Secret used as the key identifier (`x-id`). Use the test secret for sandbox traffic. |
| `API_URL` | Optional; overrides the base API hostname if you are hitting a custom endpoint. |
| `NODE_ENV` | Controls which base URL is used in the example scripts (`development` uses `DEV_BASE_URL`). |
| `DEV_BASE_URL`/`PROD_BASE_URL` | Provide these when running the `test/index.js` helper script. |

## Testing & verification

### Unit / integration tests
```bash
npm test
```

Jest loads `test/.env.test` (you can copy from `test/compose.yaml` as needed) and exercises the `createPayment` path. Ensure `API_KEY`, `API_SECRET`, and `API_URL` point at a reachable Rasedi sandbox.

### SDK stability script
Use `PACKAGE_VERSIONS` to iterate through published releases (see `test/run.sh`). Each iteration installs the pinned SDK version, boots `test/index.js`, and logs the result.

```bash
PACKAGE_VERSIONS="0.0.7,0.0.8,0.0.9" sh test/run.sh
```

## Contributions
Pull requests should add or update tests where changes touch behavior. Run `npm run build` before submitting to ensure the emitted files stay in sync with `dist/`.
