import axios from "axios";
import express from "express";
import ngrok from "ngrok";

const router = express.Router();

const consumer_key = process.env.CONSUMER_KEY;
const consumer_secret = process.env.CONSUMER_SECRET;

router.get("/auth", async (req: any, res: any, next: any) => {
  //form a buffer of the consumer key and secret
  let buffer = Buffer.from(consumer_key + ":" + consumer_secret);

  let auth = `Basic czVuVGw1bzBGR2F0OTFSZHl4VVd6SDBVc04wZTQyNXc6blZVaTZ5eU1ncVV2dnpKRQ==`;
  console.log("auth: ", auth);

  try {
    let { data } = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: auth,
        },
      }
    );

    req.token = data["access_token"];

    return res.send({
      success: true,
      data,
    });
  } catch (err) {
    return res.send({
      success: false,
      message: err["response"]["statusText"],
    });
  }
});

router.post("/requestPayment", async (req: any, res: any) => {
  let token = req.body.token;
  let auth = `Bearer ${token}`;

  //getting the timestamp
  let timestamp = getTimestamp();

  let bs_short_code = process.env.lipa_na_mpesa_shortcode;
  let passkey = process.env.lipa_na_mpesa_passkey;

  let password = Buffer.from(`${bs_short_code}${passkey}${timestamp}`).toString(
    "base64"
  );

  const {
    transcation_type = "CustomerPayBillOnline",
    amount,
    phoneNumber,
    transaction_desc,
    Order_ID,
  } = req.body;
  let partyB = process.env.lipa_na_mpesa_shortcode;

  // create callback url
  const callback_url = await ngrok.connect(+process.env.PORT);
  const api = ngrok.getApi();
  await api.listTunnels();

  console.log("callback_url: ", callback_url);
  let callBackUrl = `${callback_url}/stkPushCallback`;
  let accountReference = "CompanyXLTD";

  try {
    let { data }: any = await axios
      .post(
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
        {
          BusinessShortCode: bs_short_code,
          Password: password,
          Timestamp: timestamp,
          TransactionType: transcation_type,
          Amount: amount,
          PartyA: phoneNumber,
          PartyB: partyB,
          PhoneNumber: phoneNumber,
          CallBackURL: callBackUrl,
          AccountReference: accountReference,
          TransactionDesc: transaction_desc,
        },
        {
          headers: {
            Authorization: auth,
          },
        }
      )
      .catch(console.log);

    return res.send({
      success: true,
      message: data,
    });
  } catch (err) {
    return res.send({
      success: false,
      message: err,
    });
  }
});

router.post("/stkPushCallback", async (req: any, res: any) => {
  try {
    //Get the transaction description
    let message = req.body.Body.stkCallback["ResultDesc"];
    return res.send({
      success: true,
      message,
    });
  } catch (err) {
    return res.send({
      success: false,
      err,
    });
  }
});

router.get("/confirmPayment/:CheckoutRequestID", async (req: any, res: any) => {
  try {
    const url = "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query";

    const auth = "Bearer " + req.headers.token;

    const timestamp = getTimestamp();
    //shortcode + passkey + timestamp
    const password = Buffer.from(
      process.env.lipa_na_mpesa_shortcode +
        process.env.lipa_na_mpesa_passkey +
        timestamp
    ).toString("base64");

    const payload = {
      BusinessShortCode: process.env.lipa_na_mpesa_shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: req.params.CheckoutRequestID,
    };
    await axios
      .post(url, payload, {
        headers: {
          Authorization: auth,
        },
      })
      .then((result: any) =>
        res
          .status(result.status ?? 200)
          .send({ success: true, result: result?.data })
      )
      .catch((err: any) => {
        console.log(err);
        return res.status(err.status ?? 500).send({ err });
      });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      success: false,
      err,
    });
  }
});

function parseDate(val: any) {
  return val < 10 ? "0" + val : val;
}

export const getTimestamp = () => {
  const dateString = new Date().toLocaleString("en-us", {
    timeZone: "Africa/Nairobi",
  });
  const dateObject = new Date(dateString);
  const month = parseDate(dateObject.getMonth() + 1);
  const day = parseDate(dateObject.getDate());
  const hour = parseDate(dateObject.getHours());
  const minute = parseDate(dateObject.getMinutes());
  const second = parseDate(dateObject.getSeconds());
  return (
    dateObject.getFullYear() +
    "" +
    month +
    "" +
    day +
    "" +
    hour +
    "" +
    minute +
    "" +
    second
  );
};

export default router;
