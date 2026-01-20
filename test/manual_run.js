const PaymentRestClient = require("../dist/index.js").default;
const { GATEWAY } = require("../dist/index.js");
require("dotenv").config();

const privateKey = process.env.PV_KEY;
const secret = process.env.SECRET;

if (!privateKey || !secret) {
  console.error("Missing PV_KEY or SECRET in .env file.");
  process.exit(1);
}

// Ensure the key is properly formatted (mostly for the multi-line env var issue)
const formattedKey = privateKey.replace(/\\n/g, "\n");

const client = new PaymentRestClient(formattedKey, secret);

async function main() {
  try {
    console.log("---------------------------------------------------");
    console.log("Starting Manual SDK Test...");
    console.log("---------------------------------------------------");

    // 1. Create Payment
    console.log("1. Creating Payment...");
    const createRes = await client.createPayment({
      amount: "1000", // 10.00 SAR usually, depending on currency
      title: "Test Payment",
      description: "Manual test run",
      gateways: [GATEWAY.ZAIN], // Using a gateway from the enum
      redirectUrl: "https://example.com/redirect",
      callbackUrl: "https://example.com/callback",
      collectFeeFromCustomer: false,
      collectCustomerEmail: false,
      collectCustomerPhoneNumber: false,
      allowPromoCode: false,
    });

    console.log(`Status: ${createRes.statusCode}`);
    if (createRes.statusCode !== 200 && createRes.statusCode !== 201) {
      console.error("Create Payment Failed:", createRes.body);
      return;
    }
    console.log("Payment Created Successfully.");
    console.log("Body:", JSON.stringify(createRes.body, null, 2));

    const referenceCode = createRes.body.referenceCode;
    console.log(`\nReference Code: ${referenceCode}`);

    if (!referenceCode) {
      console.error("No reference code returned!");
      return;
    }

    // 2. Get Payment Status
    console.log("\n2. Getting Payment Status...");
    const getRes = await client.getPaymentById(referenceCode);
    console.log(`Status: ${getRes.statusCode}`);
    console.log("Body:", JSON.stringify(getRes.body, null, 2));

    // 3. Cancel Payment
    console.log("\n3. Cancelling Payment...");
    const cancelRes = await client.cancelPayment(referenceCode);
    console.log(`Status: ${cancelRes.statusCode}`);
    console.log("Body:", JSON.stringify(cancelRes.body, null, 2));

    console.log("\n---------------------------------------------------");
    console.log("Test Completed.");
    console.log("---------------------------------------------------");
  } catch (error) {
    console.error("Test Failed with Error:", error);
  }
}

main();
