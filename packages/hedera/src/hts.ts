export const INF_ASSET = "INF";

export function assertProductAssetInf(asset: string): void {
  if (asset !== INF_ASSET) {
    throw new Error("Product settlement asset must be INF");
  }
}
