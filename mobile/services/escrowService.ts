import { TOKEN_API_URL } from "../app/config";

export interface EscrowPublicConfig {
  chainId: number;
  verifyingContract: string;
  rpcUrl: string | null;
  eip712: { name: string; version: string };
}

export interface JoinCalldataResponse {
  chainId: number;
  to: string;
  data: `0x${string}`;
  value: `0x${string}`;
  eip681?: string; // optional convenience URL
  coinbaseWalletUrl?: string; // universal link
  raceId?: number;
  fallbackDataHex?: `0x${string}`; // abi-encoded uint256 raceId for fallback send
}

async function baseUrl(): Promise<string> {
  if (!TOKEN_API_URL) {
    throw new Error(
      "Missing token API URL. Set EXPO_PUBLIC_TOKEN_API_URL or configure app.config.ts extra.",
    );
  }
  return TOKEN_API_URL.replace(/\/$/, "");
}

export const EscrowService = {
  async getPublicConfig(): Promise<EscrowPublicConfig> {
    const base = await baseUrl();
    const res = await fetch(`${base}/config/public`);
    if (!res.ok) throw new Error(`config fetch failed: ${res.status}`);
    return (await res.json()) as EscrowPublicConfig;
  },

  async getJoinCalldataByChallengeId(challengeId: number | string): Promise<JoinCalldataResponse> {
    const base = await baseUrl();
    const res = await fetch(`${base}/escrow/join-calldata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: String(challengeId) }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`join-calldata failed (${res.status}): ${text.substring(0, 200)}`);
    }
    return (await res.json()) as JoinCalldataResponse;
  },
};
