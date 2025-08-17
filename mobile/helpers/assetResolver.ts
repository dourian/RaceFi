// Helper to map string asset paths to static require() so React Native can load them.
// Add entries here for any local asset paths that appear in your data (e.g., Supabase profiles.avatar_url)

// IMPORTANT: React Native requires static paths inside require(). You cannot build the path dynamically at runtime.
// Therefore, we maintain a dictionary of known paths.

const assetMap: Record<string, any> = {
  "/assets/running/athlete-in-motion.png": require("../assets/running/athlete-in-motion.png"),
  "/assets/running/diverse-group-athletes.png": require("../assets/running/diverse-group-athletes.png"),
  "/assets/running/runner-profile.png": require("../assets/running/runner-profile.png"),
  "/assets/running/athlete-2.png": require("../assets/running/athlete-2.png"),
  // Common data typo with trailing period – map explicitly
  "/assets/running/athlete-in-motion.png.": require("../assets/running/athlete-in-motion.png"),
};

function normalizeKey(input: string): string {
  let s = input.trim();
  if (!s.startsWith("/")) s = `/${s}`;
  // Strip a single trailing period often present in pasted values
  if (s.endsWith(".")) s = s.slice(0, -1);
  return s;
}

export function resolveImageSource(input: string): any | null {
  if (!input) return null;
  const key = normalizeKey(input);
  const hit = assetMap[key];
  return hit || null;
}

export function registerAsset(pathKey: string, module: any) {
  // Optional: allow programmatic extension if needed
  const key = normalizeKey(pathKey);
  assetMap[key] = module;
}

