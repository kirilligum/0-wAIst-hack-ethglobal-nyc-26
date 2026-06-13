import { describe, expect, it } from "vitest";
import { assertProductAssetInf, INF_ASSET, tokenIdToEvmAddress } from "./hts.js";

describe("HTS INF helpers", () => {
  it("keeps INF as the only product settlement asset", () => {
    expect(() => assertProductAssetInf(INF_ASSET)).not.toThrow();
    expect(() => assertProductAssetInf("HBAR")).toThrow("Product settlement asset must be INF");
  });

  it("converts HTS token IDs to EVM addresses", () => {
    expect(tokenIdToEvmAddress("0.0.123")).toBe("0x000000000000000000000000000000000000007b");
  });
});
