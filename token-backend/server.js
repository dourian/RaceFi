import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { generateJwt } from "@coinbase/cdp-sdk/auth";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3011;
const KEY_NAME = process.env.KEY_NAME;
const KEY_SECRET = process.env.KEY_SECRET;

const ONRAMP_API_BASE =
  process.env.ONRAMP_API_BASE || "https://api.developer.coinbase.com/onramp/v1";
const ONRAMP_REDIRECT_URL =
  process.env.ONRAMP_REDIRECT_URL || "racefi://success";

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Create a secure Onramp session and return sessionToken
app.post("/onramp/session", async (req, res) => {
  try {
    const {
      address,
      chain = "base",
      asset = "USDC",
      amountUsd,
      fiatCurrency = "USD",
    } = req.body || {};

    if (!address) return res.status(400).json({ error: "address required" });
    if (!amountUsd || Number(amountUsd) <= 0)
      return res.status(400).json({ error: "amountUsd > 0 required" });

    if (!KEY_NAME || !KEY_SECRET) {
      return res
        .status(500)
        .json({
          error: "server_config_error",
          detail: "Missing KEY_NAME/KEY_SECRET",
        });
    }

    const JWT = await generateJwt({
      apiKeyId: KEY_NAME,
      apiKeySecret: KEY_SECRET,
      requestMethod: "POST",
      requestHost: "api.developer.coinbase.com",
      requestPath: "/onramp/v1/token",
      expiresIn: 120,
    });

    const tokenResp = await fetch(
      "https://api.developer.coinbase.com/onramp/v1/token",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${JWT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addresses: [{ address, blockchains: [chain] }],
          assets: [asset],
          // Keep logic identical to current usage; amount/fiat are passed to web URL layer
        }),
      },
    );

    const tokenText = await tokenResp.text();
    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      tokenData = { raw: tokenText };
    }

    if (!tokenResp.ok) {
      console.error("Coinbase token error", tokenResp.status, tokenData);
      return res.status(502).json({
        error: "coinbase_token_error",
        status: tokenResp.status,
        detail: tokenData,
      });
    }

    const sessionToken = tokenData.token || tokenData.sessionToken;
    if (!sessionToken) {
      return res
        .status(502)
        .json({ error: "missing_session_token", detail: tokenData });
    }

    return res.json({ sessionToken });
  } catch (e) {
    console.error("Session creation error", e);
    return res.status(500).json({ error: "server_error" });
  }
});

// Proxy: CDP List EVM token balances
// GET /cdp/evm/token-balances/:network/:address?pageSize=&pageToken=
app.get("/cdp/evm/token-balances/:network/:address", async (req, res) => {
  try {
    const { network, address } = req.params;
    const { pageSize, pageToken } = req.query;

    if (!KEY_NAME || !KEY_SECRET) {
      return res.status(500).json({
        error: "server_config_error",
        detail: "Missing KEY_NAME/KEY_SECRET",
      });
    }

    const requestMethod = "GET";
    const requestHost = "api.cdp.coinbase.com";

    const qs = buildQuery({ pageSize, pageToken });
    const requestPath = `/platform/v2/evm/token-balances/${network}/${address}${qs}`;

    const jwt = await generateJwt({
      apiKeyId: KEY_NAME,
      apiKeySecret: KEY_SECRET,
      requestMethod,
      requestHost,
      requestPath,
      expiresIn: 120,
    });

    const url = `https://${requestHost}${requestPath}`;
    const r = await fetch(url, {
      method: requestMethod,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${jwt}`,
      },
    });

    const text = await r.text();
    res.status(r.status).type("application/json").send(text);
  } catch (e) {
    console.error("CDP balances proxy error", e);
    res.status(500).json({ error: "server_error", detail: String(e) });
  }
});

function buildQuery(params) {
  const u = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== "") u.set(k, String(v));
  });
  const s = u.toString();
  return s ? `?${s}` : "";
}

app.listen(PORT, () => {
  console.log(`RaceFi token backend listening on http://localhost:${PORT}`);
});
