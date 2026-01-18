const { GATEWAY } = require("rasedi");

require("dotenv").config();
const PaymentRestClient = require("rasedi").default;

const privateKey = process.env.PV_KEY;
const secret = process.env.SECRET;

const PROD_BASE_URL = process.env.PROD_BASE_URL;
const DEV_BASE_URL = process.env.DEV_BASE_URL;
const NODE_ENV = process.env.NODE_ENV;

const baseUrl = NODE_ENV === "development" ? DEV_BASE_URL : PROD_BASE_URL;

if (!privateKey || !secret) {
  console.error("Missing PRIVATE_KEY or SECRET in environment variables.");
  process.exit(1);
}

const logResult = (title, res) => {
  console.log(`\n🔹 ${title}`);
  console.log(`Status Code: ${res.statusCode}`);
  console.log("Response Body:", res.body);
};

async function main() {
  const prc = new PaymentRestClient(privateKey, secret, baseUrl);

  try {
    console.log("Starting SDK test sequence...");

    const createRes = await prc.createPayment({
      amount: "1000",
      gateways: [GATEWAY.ZAIN],
      title: "Automated SDK Test Payment",
      description: "CI/CD Integration Test",
      redirectUrl: "https://example.com",
      collectFeeFromCustomer: false,
      collectCustomerEmail: false,
      collectCustomerPhoneNumber: false,
    });
    logResult("Create Payment", createRes);

    const referenceCode = createRes.body.referenceCode;
    if (!referenceCode) {
      throw new Error("No reference code returned from createPayment.");
    }

    //️ Get Payment by ID
    const getRes = await prc.getPaymentById(referenceCode);
    logResult("Get Payment by ID", getRes);

    // Verify Payment (simulate fake data here)
    try {
      const verifyRes = await prc.verify({
        keyId: "Fake-key",
        content: "content_string",
      });
      logResult("Verify Payment", verifyRes);
    } catch (verifyErr) {
      console.warn(
        "Verification failed. This is expected. The verify method must be called by the merchant after the webhook calls the merchant's server"
      );
    }

    // Cancel Payment
    const cancelRes = await prc.cancelPayment(referenceCode);
    logResult("Cancel Payment", cancelRes);

    console.log("\nAll SDK endpoints executed successfully.");
  } catch (err) {
    console.error("\nSDK Test Failed:");
    console.error(err.message || err);
    process.exit(1);
  }
}

main();
