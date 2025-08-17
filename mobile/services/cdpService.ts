import { TOKEN_API_URL } from "../app/config";

export type EvmNetwork = "base" | "base-sepolia" | "ethereum";

export interface TokenBalanceAmountDto {
  amount: string; // raw, unformatted string amount (e.g. wei)
  decimals: number;
}

export interface TokenInfoDto {
  network: EvmNetwork;
  symbol: string;
  name: string;
  contractAddress: string; // native gas token uses 0xEeee... sentinel
}

export interface TokenBalanceDto {
  amount: TokenBalanceAmountDto;
  token: TokenInfoDto;
}

export interface ListTokenBalancesResponseDto {
  balances: TokenBalanceDto[];
  nextPageToken?: string;
}

function assertApiUrl(): string {
  if (!TOKEN_API_URL) {
    throw new Error(
      "Missing API base URL. Set EXPO_PUBLIC_TOKEN_API_URL or EXPO_PUBLIC_API_URL."
    );
  }
  return TOKEN_API_URL.replace(/\/$/, "");
}

export async function listEvmTokenBalances(params: {
  network: EvmNetwork;
  address: string;
  pageSize?: number;
  pageToken?: string;
}): Promise<ListTokenBalancesResponseDto> {
  const base = assertApiUrl();
  const url = new URL(
    `${base}/cdp/evm/token-balances/${params.network}/${params.address}`
  );
  if (params.pageSize) url.searchParams.set("pageSize", String(params.pageSize));
  if (params.pageToken) url.searchParams.set("pageToken", params.pageToken);

  const res = await fetch(url.toString(), { headers: { "Accept": "application/json" } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Balances fetch failed (${res.status}): ${text.substring(0, 300)}`);
  }
  const data = (await res.json()) as ListTokenBalancesResponseDto;
  return data;
}

export function formatUnits(raw: string, decimals: number): string {
  // format to a trimmed decimal string without bringing in a big-number lib
  // Only for display; do not use for precise math
  const neg = raw.startsWith("-");
  const s = neg ? raw.slice(1) : raw;
  let int = s;
  let frac = "";
  if (decimals > 0) {
    if (s.length <= decimals) {
      int = "0";
      frac = s.padStart(decimals, "0");
    } else {
      int = s.slice(0, s.length - decimals);
      frac = s.slice(s.length - decimals);
    }
  }
  // trim leading zeros in int and trailing zeros in frac
  int = int.replace(/^0+/, "");
  if (int === "") int = "0";
  frac = frac.replace(/0+$/, "");
  return (neg ? "-" : "") + (frac ? `${int}.${frac}` : int);
}
