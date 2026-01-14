import { config } from "dotenv";
import PaymentRestClient from "../src/index";

config({ path: "./.env.test" });

describe("payment", () => {
  const secret = process.env.API_SECRET || "";
  const key = process.env.API_KEY || "";
  const url = process.env.API_URL || "";

  beforeAll(() => {
    expect(secret).toBeTruthy();
    expect(key).toBeTruthy();
  });

  const miro = new PaymentRestClient(key, secret, url);

  it("create", async () => {
    const result = await miro.createPayment({
      allowPromoCode: false,
      amount: "1000",
      collectCustomerEmail: false,
      collectCustomerPhoneNumber: false,
      collectFeeFromCustomer: false,
      description: "test description",
      gateways: [],
      redirectUrl: "http://localhost:3000",
      title: "test payment",
    });

    expect(result).toBeTruthy();
  });
});
