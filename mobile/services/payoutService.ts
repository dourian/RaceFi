const TOKEN_API_BASE = process.env.EXPO_PUBLIC_TOKEN_API_URL || process.env.TOKEN_API_URL;

async function baseUrl(): Promise<string> {
  if (!TOKEN_API_BASE) {
    throw new Error(
      "Missing TOKEN API URL. Set EXPO_PUBLIC_TOKEN_API_URL in your .env (Expo public env).",
    );
  }
  return TOKEN_API_BASE.replace(/\/$/, "");
}

export const PayoutService = {
  async win(to: string): Promise<{ ok: boolean; txHash?: string; error?: string }> {
    const base = await baseUrl();
    const res = await fetch(`${base}/payout/win`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to }),
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {}
    if (!res.ok) {
      return { ok: false, error: json?.error || text.slice(0, 200) };
    }
    return { ok: true, txHash: json?.txHash };
  },
};

