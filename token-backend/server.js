import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { generateJwt } from "@coinbase/cdp-sdk/auth";
import {
  isAddress,
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  getAddress,
  parseAbi,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8002;
const KEY_NAME = process.env.KEY_NAME;
const KEY_SECRET = process.env.KEY_SECRET;

// EIP-712 config
const RESULT_SIGNER_PRIVATE_KEY = process.env.RESULT_SIGNER_PRIVATE_KEY;
const EIP712_NAME = process.env.EIP712_NAME || "RaceEscrow";
const EIP712_VERSION = process.env.EIP712_VERSION || "1";
const CHAIN_ID = Number(process.env.CHAIN_ID || 84532); // Base Sepolia
const VERIFYING_CONTRACT =
  process.env.VERIFYING_CONTRACT ||
  "0x0000000000000000000000000000000000000000";

let resultSignerAccount = null;
if (RESULT_SIGNER_PRIVATE_KEY) {
  try {
    resultSignerAccount = privateKeyToAccount(RESULT_SIGNER_PRIVATE_KEY);
    // eslint-disable-next-line no-console
    console.log("Result signer loaded:", resultSignerAccount.address);
  } catch (e) {
    console.error("Failed to load RESULT_SIGNER_PRIVATE_KEY:", e);
  }
}

// On-chain config (viem)
const RPC_URL = process.env.RPC_URL || process.env.ANVIL_RPC_URL;
const OPERATOR_PRIVATE_KEY = process.env.ESCROW_OPERATOR_PRIVATE_KEY;

const RACE_ESCROW_ABI = parseAbi([
  "event RaceCreated(uint256 indexed raceId, uint256 stakeWei, uint256 joinDeadline, address organizer)",
  "event Joined(uint256 indexed raceId, address indexed runner)",
  "event Closed(uint256 indexed raceId)",
  "event Resolved(uint256 indexed raceId, address indexed winner, uint256 amount)",
  "event Refunded(uint256 indexed raceId)",
  "event DirectDeposit(address indexed from, uint256 amount)",
  "event FallbackDeposit(address indexed from, uint256 amount, bytes data)",
  "event Deposited(uint256 indexed raceId, address indexed from, uint256 amount)",
  "function nextRaceId() view returns (uint256)",
  "function getRace(uint256 raceId) view returns (uint256 stakeWei, uint256 joinDeadline, address organizer, address resultSigner, uint8 state, address winner, uint256 pool, uint256 participantCount)",
  "function participantsOf(uint256 raceId) view returns (address[])",
  "function hasJoined(uint256 raceId, address user) view returns (bool)",
  "function createRace(uint256 stakeWei, uint256 joinWindowSeconds, address resultSigner) returns (uint256)",
  "function joinRace(uint256 raceId) payable",
  "function depositToRace(uint256 raceId) payable",
  "function claimToRace(uint256 raceId)",
  "function claimToRaceFor(address user, uint256 raceId)",
  "function closeJoin(uint256 raceId)",
  "function submitResult(uint256 raceId, address winner, bytes signature)",
]);

// Create clients if RPC configured
let publicClient = null;
let walletClient = null;
let operatorAccount = null;

if (RPC_URL) {
  try {
    publicClient = createPublicClient({
      transport: http(RPC_URL),
      chain: undefined, // chainId is supplied per request where needed
    });
  } catch (e) {
    console.error("Failed to create public client:", e);
  }
}

if (OPERATOR_PRIVATE_KEY && RPC_URL) {
  try {
    operatorAccount = privateKeyToAccount(OPERATOR_PRIVATE_KEY);
    walletClient = createWalletClient({
      account: operatorAccount,
      transport: http(RPC_URL),
      chain: undefined,
    });
    console.log("Escrow operator loaded:", operatorAccount.address);
  } catch (e) {
    console.error("Failed to init operator wallet:", e);
  }
}

const ONRAMP_API_BASE =
  process.env.ONRAMP_API_BASE || "https://api.developer.coinbase.com/onramp/v1";
const ONRAMP_REDIRECT_URL =
  process.env.ONRAMP_REDIRECT_URL || "racefi://success";

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Simple payout readiness
app.get("/payout/status", (_req, res) => {
  try {
    res.json({
      hasRpc: !!RPC_URL,
      hasWalletClient: !!walletClient,
      hasOperator: !!operatorAccount,
      operator: operatorAccount?.address || null,
      rpcUrl: RPC_URL || null,
    });
  } catch (e) {
    res.status(500).json({ error: "server_error" });
  }
});

// Send 0.002 ETH from operator key to the provided address (testnet win tip)
// POST /payout/win { to }
app.post("/payout/win", async (req, res) => {
  try {
    if (!walletClient || !operatorAccount) {
      return res.status(500).json({
        error: "operator_unavailable",
        detail: { hasWalletClient: !!walletClient, hasOperator: !!operatorAccount },
      });
    }
    const { to } = req.body || {};
    if (!to || !isAddress(to)) return res.status(400).json({ error: "invalid_to" });

    const value = parseEther("0.002");
    try {
      let chainId = null;
      let operatorBalance = null;
      try {
        if (publicClient) chainId = await publicClient.getChainId();
      } catch {}
      try {
        if (publicClient && operatorAccount?.address) {
          operatorBalance = (await publicClient.getBalance({ address: operatorAccount.address })).toString();
        }
      } catch {}

      const hash = await walletClient.sendTransaction({
        to: getAddress(to),
        value,
        account: operatorAccount,
      });
      return res.json({ ok: true, txHash: hash, to: getAddress(to), valueWei: value.toString(), chainId, operator: operatorAccount.address, operatorBalance });
    } catch (e) {
      const err = e || {};
      return res.status(500).json({ ok: false, error: "send_failed", detail: String(err?.shortMessage || err?.message || err), stack: (err?.stack || undefined) });
    }
  } catch (e) {
    console.error("win payout error", e);
    return res.status(500).json({ error: "server_error" });
  }
});

// Payout diagnostics: chain, operator balance
app.get("/payout/diag", async (_req, res) => {
  try {
    let chainId = null;
    let operator = operatorAccount?.address || null;
    let operatorBalance = null;
    try {
      if (publicClient) chainId = await publicClient.getChainId();
    } catch {}
    try {
      if (publicClient && operator) {
        operatorBalance = (await publicClient.getBalance({ address: operator })).toString();
      }
    } catch {}
    return res.json({ hasRpc: !!RPC_URL, rpcUrl: RPC_URL || null, hasWalletClient: !!walletClient, operator, chainId, operatorBalance });
  } catch (e) {
    return res.status(500).json({ error: "server_error" });
  }
});

// Debug: surface escrow runtime status safely (no secrets)
app.get("/debug/escrow-status", (_req, res) => {
  try {
    res.json({
      chainId: CHAIN_ID,
      hasRpc: !!RPC_URL,
      hasPublicClient: !!publicClient,
      hasWalletClient: !!walletClient,
      hasOperator: !!operatorAccount,
      verifyingContract: VERIFYING_CONTRACT,
      hasVerifyingContract:
        !!VERIFYING_CONTRACT &&
        VERIFYING_CONTRACT !== "0x0000000000000000000000000000000000000000",
      hasResultSigner: !!resultSignerAccount,
    });
  } catch (e) {
    res.status(500).json({ error: "server_error" });
  }
});

// Public config for mobile clients
app.get("/config/public", (_req, res) => {
  res.json({
    chainId: CHAIN_ID,
    verifyingContract: VERIFYING_CONTRACT,
    rpcUrl: RPC_URL ? "configured" : null,
    eip712: { name: EIP712_NAME, version: EIP712_VERSION },
  });
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
      return res.status(500).json({
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

// Sign an EIP-712 race result so the app can submit on-chain
// POST /race/:id/sign-result { winner, nonce }
app.post("/race/:id/sign-result", async (req, res) => {
  try {
    if (!resultSignerAccount) {
      return res.status(500).json({
        error: "server_config_error",
        detail: "Missing RESULT_SIGNER_PRIVATE_KEY",
      });
    }

    const raceIdParam = req.params.id;
    const raceId = BigInt(raceIdParam);

    const { winner, nonce } = req.body || {};
    if (!winner || !isAddress(winner)) {
      return res.status(400).json({ error: "invalid_winner" });
    }
    if (nonce === undefined || nonce === null) {
      return res.status(400).json({ error: "missing_nonce" });
    }

    let nonceBig;
    try {
      nonceBig = BigInt(nonce);
    } catch {
      return res.status(400).json({ error: "invalid_nonce" });
    }

    const domain = {
      name: EIP712_NAME,
      version: EIP712_VERSION,
      chainId: CHAIN_ID,
      verifyingContract: VERIFYING_CONTRACT,
    };

    const types = {
      RaceResult: [
        { name: "raceId", type: "uint256" },
        { name: "winner", type: "address" },
        { name: "nonce", type: "uint256" },
      ],
    };

    const message = {
      raceId,
      winner,
      nonce: nonceBig,
    };

    const signature = await resultSignerAccount.signTypedData({
      domain,
      primaryType: "RaceResult",
      types,
      message,
    });

    return res.json({
      signature,
      signer: resultSignerAccount.address,
      domain,
      types,
      message: {
        ...message,
        raceId: raceId.toString(),
        nonce: nonceBig.toString(),
      },
    });
  } catch (e) {
    console.error("sign-result error", e);
    return res.status(500).json({ error: "server_error" });
  }
});

// -------- Escrow read endpoints (chain state) --------
app.get("/escrow/nextRaceId", async (_req, res) => {
  try {
    if (!publicClient || !VERIFYING_CONTRACT)
      return res.status(500).json({ error: "chain_unavailable" });
    const result = await publicClient.readContract({
      address: getAddress(VERIFYING_CONTRACT),
      abi: RACE_ESCROW_ABI,
      functionName: "nextRaceId",
    });
    res.json({ nextRaceId: result.toString() });
  } catch (e) {
    console.error("nextRaceId error", e);
    res.status(500).json({ error: "server_error" });
  }
});

app.get("/escrow/race/:id", async (req, res) => {
  try {
    if (!publicClient || !VERIFYING_CONTRACT)
      return res.status(500).json({ error: "chain_unavailable" });
    const raceId = BigInt(req.params.id);
    const [
      stakeWei,
      joinDeadline,
      organizer,
      resultSigner,
      state,
      winner,
      pool,
      participantCount,
    ] = await publicClient.readContract({
      address: getAddress(VERIFYING_CONTRACT),
      abi: RACE_ESCROW_ABI,
      functionName: "getRace",
      args: [raceId],
    });
    const participants = await publicClient.readContract({
      address: getAddress(VERIFYING_CONTRACT),
      abi: RACE_ESCROW_ABI,
      functionName: "participantsOf",
      args: [raceId],
    });
    res.json({
      raceId: raceId.toString(),
      stakeWei: stakeWei.toString(),
      joinDeadline: joinDeadline.toString(),
      organizer,
      resultSigner,
      state: Number(state),
      winner,
      pool: pool.toString(),
      participantCount: participantCount.toString(),
      participants,
    });
  } catch (e) {
    console.error("getRace error", e);
    res.status(500).json({ error: "server_error" });
  }
});

// Lightweight diagnostics for join readiness
app.get("/escrow/diag/join/:id", async (req, res) => {
  try {
    if (!publicClient || !VERIFYING_CONTRACT)
      return res.status(500).json({ error: "chain_unavailable" });
    const raceId = BigInt(req.params.id);
    const [stakeWei, joinDeadline, , , state] = await publicClient.readContract(
      {
        address: getAddress(VERIFYING_CONTRACT),
        abi: RACE_ESCROW_ABI,
        functionName: "getRace",
        args: [raceId],
      },
    );
    const now = Math.floor(Date.now() / 1000);
    res.json({
      chainId: CHAIN_ID,
      raceId: raceId.toString(),
      stakeWei: stakeWei.toString(),
      stakeWeiHex: `0x${BigInt(stakeWei).toString(16)}`,
      joinDeadline: joinDeadline.toString(),
      state: Number(state),
      now,
      isOpen: Number(state) === 0,
      isBeforeDeadline: now <= Number(joinDeadline),
    });
  } catch (e) {
    console.error("diag join error", e);
    res.status(500).json({ error: "server_error" });
  }
});

// Simulate a join to fetch revert reason without sending a tx
app.get("/escrow/simulate-join/:id/:user", async (req, res) => {
  try {
    if (!publicClient || !VERIFYING_CONTRACT)
      return res.status(500).json({ error: "chain_unavailable" });
    const raceId = BigInt(req.params.id);
    const user = getAddress(req.params.user);
    const [stakeWei, joinDeadline, , , state] = await publicClient.readContract(
      {
        address: getAddress(VERIFYING_CONTRACT),
        abi: RACE_ESCROW_ABI,
        functionName: "getRace",
        args: [raceId],
      },
    );

    try {
      const sim = await publicClient.simulateContract({
        address: getAddress(VERIFYING_CONTRACT),
        abi: RACE_ESCROW_ABI,
        functionName: "joinRace",
        args: [raceId],
        account: user,
        value: BigInt(stakeWei),
      });
      return res.json({ ok: true, request: sim.request });
    } catch (e) {
      const err = e || {};
      const detail = {
        name: err.name,
        message: err.message,
        shortMessage: err.shortMessage,
        details: err.details,
      };
      return res.status(400).json({
        ok: false,
        error: "simulate_revert",
        reason: err.shortMessage || err.message || "reverted",
        state: Number(state),
        joinDeadline: joinDeadline.toString(),
        stakeWei: stakeWei.toString(),
        user,
        detail,
      });
    }
  } catch (e) {
    console.error("simulate-join error", e);
    res.status(500).json({ error: "server_error" });
  }
});

app.get("/escrow/hasJoined/:id/:user", async (req, res) => {
  try {
    if (!publicClient || !VERIFYING_CONTRACT)
      return res.status(500).json({ error: "chain_unavailable" });
    const raceId = BigInt(req.params.id);
    const user = getAddress(req.params.user);
    const joined = await publicClient.readContract({
      address: getAddress(VERIFYING_CONTRACT),
      abi: RACE_ESCROW_ABI,
      functionName: "hasJoined",
      args: [raceId, user],
    });
    res.json({ raceId: raceId.toString(), user, joined: !!joined });
  } catch (e) {
    console.error("hasJoined error", e);
    res.status(500).json({ error: "server_error" });
  }
});

// -------- Escrow mutation endpoints (operator; testnet only) --------
app.post("/escrow/create", async (req, res) => {
  try {
    if (!walletClient || !operatorAccount || !VERIFYING_CONTRACT) {
      return res.status(500).json({
        error: "operator_unavailable",
        detail: {
          hasWalletClient: !!walletClient,
          hasOperator: !!operatorAccount,
          hasVerifyingContract:
            !!VERIFYING_CONTRACT &&
            VERIFYING_CONTRACT !== "0x0000000000000000000000000000000000000000",
        },
      });
    }
    const { stakeWei, joinWindowSeconds, resultSigner } = req.body || {};
    if (!stakeWei || !joinWindowSeconds)
      return res.status(400).json({ error: "bad_params" });

    const signerAddr = resultSigner
      ? isAddress(resultSigner)
        ? getAddress(resultSigner)
        : null
      : resultSignerAccount
        ? resultSignerAccount.address
        : null;
    if (!signerAddr) return res.status(400).json({ error: "missing_signer" });

    // Predict raceId as current nextRaceId (since contract uses raceId = nextRaceId++)
    let predictedRaceId = null;
    try {
      const nextId = await publicClient.readContract({
        address: getAddress(VERIFYING_CONTRACT),
        abi: RACE_ESCROW_ABI,
        functionName: "nextRaceId",
      });
      predictedRaceId = Number(nextId);
    } catch {}

    const hash = await walletClient.writeContract({
      address: getAddress(VERIFYING_CONTRACT),
      abi: RACE_ESCROW_ABI,
      functionName: "createRace",
      args: [BigInt(stakeWei), BigInt(joinWindowSeconds), signerAddr],
      chain: undefined,
      account: operatorAccount,
    });
    res.json({ txHash: hash, raceId: predictedRaceId });
  } catch (e) {
    console.error("createRace op error", e);
    res.status(500).json({ error: "server_error" });
  }
});

app.post("/escrow/close/:id", async (req, res) => {
  try {
    if (!walletClient || !operatorAccount || !VERIFYING_CONTRACT) {
      return res.status(500).json({
        error: "operator_unavailable",
        detail: {
          hasWalletClient: !!walletClient,
          hasOperator: !!operatorAccount,
          hasVerifyingContract:
            !!VERIFYING_CONTRACT &&
            VERIFYING_CONTRACT !== "0x0000000000000000000000000000000000000000",
        },
      });
    }
    const raceId = BigInt(req.params.id);
    const hash = await walletClient.writeContract({
      address: getAddress(VERIFYING_CONTRACT),
      abi: RACE_ESCROW_ABI,
      functionName: "closeJoin",
      args: [raceId],
      account: operatorAccount,
    });
    res.json({ txHash: hash });
  } catch (e) {
    console.error("closeJoin op error", e);
    res.status(500).json({ error: "server_error" });
  }
});

app.post("/escrow/submit/:id", async (req, res) => {
  try {
    if (!walletClient || !operatorAccount || !VERIFYING_CONTRACT) {
      return res.status(500).json({
        error: "operator_unavailable",
        detail: {
          hasWalletClient: !!walletClient,
          hasOperator: !!operatorAccount,
          hasVerifyingContract:
            !!VERIFYING_CONTRACT &&
            VERIFYING_CONTRACT !== "0x0000000000000000000000000000000000000000",
        },
      });
    }
    const raceId = BigInt(req.params.id);
    const { winner, signature } = req.body || {};
    if (!isAddress(winner) || !signature)
      return res.status(400).json({ error: "bad_params" });
    const hash = await walletClient.writeContract({
      address: getAddress(VERIFYING_CONTRACT),
      abi: RACE_ESCROW_ABI,
      functionName: "submitResult",
      args: [raceId, getAddress(winner), signature],
      account: operatorAccount,
    });
    res.json({ txHash: hash });
  } catch (e) {
    console.error("submitResult op error", e);
    res.status(500).json({ error: "server_error" });
  }
});

// Helper: return encoded joinRace call for wallets
// Simple disk-based mapping between app challenge IDs and on-chain race IDs
import fs from "fs";
import path from "path";
const MAP_FILE = path.join(process.cwd(), "race-map.json");
function loadMap() {
  try {
    const raw = fs.readFileSync(MAP_FILE, "utf8");
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}
function saveMap(obj) {
  try {
    fs.writeFileSync(MAP_FILE, JSON.stringify(obj, null, 2));
  } catch (e) {
    console.error("Failed to save race map", e);
  }
}

// Set mapping: challengeId -> raceId
app.post("/escrow/map", (req, res) => {
  const { challengeId, raceId } = req.body || {};
  if (challengeId == null || raceId == null) {
    return res.status(400).json({ error: "missing_params" });
  }
  const m = loadMap();
  m[String(challengeId)] = Number(raceId);
  saveMap(m);
  res.json({
    ok: true,
    challengeId: String(challengeId),
    raceId: Number(raceId),
  });
});

// Get mapping for a challengeId
app.get("/escrow/map/:challengeId", (req, res) => {
  const m = loadMap();
  const k = String(req.params.challengeId);
  if (!(k in m)) return res.status(404).json({ error: "not_mapped" });
  res.json({ challengeId: k, raceId: Number(m[k]) });
});

// Helper: return encoded joinRace call for wallets
app.post("/escrow/join-calldata", async (req, res) => {
  try {
    if (!publicClient || !VERIFYING_CONTRACT)
      return res.status(500).json({ error: "chain_unavailable" });
    let { raceId, challengeId } = req.body || {};

    // If challengeId provided, resolve it through the mapping
    if (
      (raceId === undefined || raceId === null) &&
      challengeId !== undefined &&
      challengeId !== null
    ) {
      const m = loadMap();
      const mapped = m[String(challengeId)];
      if (mapped === undefined) {
        return res.status(404).json({
          error: "not_mapped",
          detail: "challengeId has no on-chain race mapping",
        });
      }
      raceId = mapped;
    }

    if (raceId === undefined || raceId === null)
      return res.status(400).json({ error: "missing_raceId" });

    const id = BigInt(raceId);
    const [stakeWei, joinDeadline, , , state] = await publicClient.readContract(
      {
        address: getAddress(VERIFYING_CONTRACT),
        abi: RACE_ESCROW_ABI,
        functionName: "getRace",
        args: [id],
      },
    );

    // Guardrails: ensure joinable
    const now = Math.floor(Date.now() / 1000);
    if (Number(state) !== 0) {
      return res
        .status(409)
        .json({ error: "race_not_open", state: Number(state) });
    }
    if (now > Number(joinDeadline)) {
      return res.status(409).json({
        error: "join_closed",
        joinDeadline: joinDeadline.toString(),
        now,
      });
    }

    const data = encodeFunctionData({
      abi: RACE_ESCROW_ABI,
      functionName: "joinRace",
      args: [id],
    });
    const to = getAddress(VERIFYING_CONTRACT);
    const value = `0x${BigInt(stakeWei).toString(16)}`;
    const valueDecimal = BigInt(stakeWei).toString();

    // Provide fallback-only payload as well (for raw sends using fallback)
    const fallbackDataHex = `0x${id.toString(16).padStart(64, "0")}`;

    // Generic EIP-681 (not universally supported)
    const eip681 = `ethereum:${to}@${CHAIN_ID}/call?data=${data}&value=${valueDecimal}`;
    // Coinbase Wallet universal link (works on device and simulator with CW installed)
    const coinbaseWalletUrl = `https://go.cb-w.com/ethereum?to=${to}&value=${valueDecimal}&data=${data}&chainId=${CHAIN_ID}`;

    res.json({
      chainId: CHAIN_ID,
      to,
      data,
      value,
      valueDecimal,
      stakeWeiDecimal: valueDecimal,
      eip681,
      coinbaseWalletUrl,
      raceId: Number(id),
      fallbackDataHex,
    });
  } catch (e) {
    console.error("join-calldata error", e);
    res.status(500).json({ error: "server_error" });
  }
});

// Find a join tx hash for a user and race by scanning Joined events
app.get("/escrow/find-join/:raceId/:user", async (req, res) => {
  try {
    if (!publicClient || !VERIFYING_CONTRACT)
      return res.status(500).json({ error: "chain_unavailable" });
    const raceId = BigInt(req.params.raceId);
    const user = getAddress(req.params.user);

    // Determine fromBlock to avoid massive historical scans
    let fromBlock = "earliest";
    try {
      const startEnv = process.env.CHAIN_LOGS_START_BLOCK;
      if (startEnv && String(startEnv).trim() !== "") {
        const start = BigInt(startEnv);
        fromBlock = start;
      } else {
        // Default: scan only recent blocks window
        const latest = await publicClient.getBlockNumber();
        const window = 20000n; // ~short recent window; adjust as needed
        const start = latest > window ? latest - window : 0n;
        fromBlock = start;
      }
    } catch {}

    // Build event topic for Joined(uint256,address)
    // Note: viem "event" field constructed inline below

    // Retry getLogs to tolerate transient RPC 503s
    let logs = [];
    let lastErr = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        logs = await publicClient.getLogs({
          address: getAddress(VERIFYING_CONTRACT),
          event: {
            type: "event",
            name: "Joined",
            inputs: [
              { indexed: true, name: "raceId", type: "uint256" },
              { indexed: true, name: "runner", type: "address" },
            ],
          },
          args: { raceId, runner: user },
          fromBlock,
          toBlock: "latest",
        });
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        // If RPC is overloaded, wait a bit and retry
        await new Promise((r) => setTimeout(r, 1200));
      }
    }

    if (lastErr) {
      // Propagate a clearer error when RPC repeatedly fails
      // eslint-disable-next-line no-console
      console.error("find-join rpc error after retries", lastErr);
      return res.status(503).json({ error: "rpc_unavailable" });
    }

    if (!logs || logs.length === 0)
      return res.status(404).json({ error: "not_found" });

    // Return the latest tx hash
    const last = logs[logs.length - 1];
    res.json({ txHash: last.transactionHash });
  } catch (e) {
    console.error("find-join error", e);
    res.status(500).json({ error: "server_error" });
  }
});

// Ingest a transaction hash and try to attribute it to a race
// POST /escrow/ingest-tx { txHash, raceId?, challengeId? }
app.post("/escrow/ingest-tx", async (req, res) => {
  try {
    if (!publicClient || !VERIFYING_CONTRACT) return res.status(500).json({ error: "chain_unavailable" });

    const { txHash, raceId: raceIdRaw, challengeId } = req.body || {};
    if (!txHash) return res.status(400).json({ error: "missing_txHash" });

    // Fetch receipt
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    const to = (receipt.to || "").toLowerCase();
    const from = (receipt.from || "").toLowerCase();
    const ok = receipt.status === "success";

    if (!ok) return res.status(400).json({ error: "tx_not_success", status: receipt.status, receipt });

    const contractAddr = getAddress(VERIFYING_CONTRACT).toLowerCase();
    if (to !== contractAddr) {
      return res.status(400).json({ error: "tx_not_to_contract", to: receipt.to, contract: VERIFYING_CONTRACT });
    }

    // If Joined event already present, we're done
    try {
      const logs = await publicClient.getLogs({
        address: getAddress(VERIFYING_CONTRACT),
        event: {
          type: "event",
          name: "Joined",
          inputs: [
            { indexed: true, name: "raceId", type: "uint256" },
            { indexed: true, name: "runner", type: "address" },
          ],
        },
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      });
      const hasJoin = (logs || []).some((l) => l.transactionHash.toLowerCase() === txHash.toLowerCase());
      if (hasJoin) return res.json({ ok: true, joined: true, alreadyJoined: true, txHash });
    } catch {}

    // Determine raceId if provided via calldata (fallback-encoded)
    let raceId = raceIdRaw != null ? BigInt(raceIdRaw) : null;
    if (raceId == null) {
      // Fetch transaction to inspect input data
      const tx = await publicClient.getTransaction({ hash: txHash });
      const input = (tx.input || "0x").toLowerCase();
      if (input && input.length === 66) {
        try {
          raceId = BigInt(input);
        } catch {}
      }
    }

    // Resolve raceId through mapping endpoint if challengeId provided
    if (raceId == null && challengeId != null) {
      try {
        // Local function to read next mapping file directly
        const fs = await import("fs");
        const path = await import("path");
        const MAP_FILE = path.join(process.cwd(), "race-map.json");
        let mapping = {};
        try {
          const raw = fs.readFileSync(MAP_FILE, "utf8");
          mapping = JSON.parse(raw) || {};
        } catch {}
        const mapped = mapping[String(challengeId)];
        if (mapped !== undefined) raceId = BigInt(mapped);
      } catch {}
    }

    // If we still don't have raceId, we cannot attribute automatically
    if (raceId == null) {
      return res.status(202).json({ ok: true, joined: false, reason: "no_raceId_inferred", txHash });
    }

    // Check joinability and stake
    const [stakeWei, joinDeadline, , , state] = await publicClient.readContract({
      address: getAddress(VERIFYING_CONTRACT),
      abi: RACE_ESCROW_ABI,
      functionName: "getRace",
      args: [raceId],
    });
    const now = Math.floor(Date.now() / 1000);
    if (Number(state) !== 0 || now > Number(joinDeadline)) {
      return res.status(409).json({ ok: false, error: "race_not_joinable", state: Number(state), joinDeadline: joinDeadline.toString() });
    }

    // If operator wallet is configured, attempt claimToRaceFor(from, raceId)
    if (walletClient && operatorAccount) {
      try {
        const hash = await walletClient.writeContract({
          address: getAddress(VERIFYING_CONTRACT),
          abi: RACE_ESCROW_ABI,
          functionName: "claimToRaceFor",
          args: [getAddress(from), raceId],
          account: operatorAccount,
        });
        return res.json({ ok: true, joined: true, claimTxHash: hash, raceId: Number(raceId) });
      } catch (e) {
        return res.status(500).json({ ok: false, error: "claim_failed", detail: String(e) });
      }
    }

    // Otherwise, return instruction for the client to call claimToRace
    return res.json({ ok: true, joined: false, action: "call_claimToRace", raceId: Number(raceId) });
  } catch (e) {
    console.error("ingest-tx error", e);
    res.status(500).json({ error: "server_error" });
  }
});

// Consume pending credits for a user into a race
// POST /escrow/consume-credits { user, raceId?, challengeId? }
app.post("/escrow/consume-credits", async (req, res) => {
  try {
    if (!publicClient || !VERIFYING_CONTRACT)
      return res.status(500).json({ error: "chain_unavailable" });

    const { user: userRaw, raceId: raceIdRaw, challengeId } = req.body || {};
    if (!userRaw || !isAddress(userRaw))
      return res.status(400).json({ error: "invalid_user" });
    const user = getAddress(userRaw);

    // Resolve raceId
    let raceId = raceIdRaw != null ? BigInt(raceIdRaw) : null;
    if (raceId == null && challengeId != null) {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const MAP_FILE = path.join(process.cwd(), "race-map.json");
        let mapping = {};
        try {
          const raw = fs.readFileSync(MAP_FILE, "utf8");
          mapping = JSON.parse(raw) || {};
        } catch {}
        const mapped = mapping[String(challengeId)];
        if (mapped !== undefined) raceId = BigInt(mapped);
      } catch {}
    }
    if (raceId == null)
      return res.status(400).json({ error: "missing_raceId" });

    // Check joinability and stake
    const [stakeWei, joinDeadline, , , state] = await publicClient.readContract({
      address: getAddress(VERIFYING_CONTRACT),
      abi: RACE_ESCROW_ABI,
      functionName: "getRace",
      args: [raceId],
    });
    const now = Math.floor(Date.now() / 1000);
    if (Number(state) !== 0)
      return res.status(409).json({ error: "race_not_open", state: Number(state) });
    if (now > Number(joinDeadline))
      return res.status(409).json({ error: "join_closed", joinDeadline: joinDeadline.toString(), now });

    // If operator is configured, perform claimToRaceFor
    if (walletClient && operatorAccount) {
      try {
        const hash = await walletClient.writeContract({
          address: getAddress(VERIFYING_CONTRACT),
          abi: RACE_ESCROW_ABI,
          functionName: "claimToRaceFor",
          args: [user, raceId],
          account: operatorAccount,
        });
        return res.json({ ok: true, joined: true, claimTxHash: hash, raceId: Number(raceId) });
      } catch (e) {
        return res.status(500).json({ ok: false, error: "claim_failed", detail: String(e) });
      }
    }

    // Otherwise instruct client wallet to call claimToRace
    return res.json({ ok: true, joined: false, action: "call_claimToRace", raceId: Number(raceId) });
  } catch (e) {
    console.error("consume-credits error", e);
    res.status(500).json({ error: "server_error" });
  }
});

app.listen(PORT, () => {
  console.log(`RaceFi token backend listening on http://localhost:${PORT}`);
});
