import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { describe, expect, it } from "vitest";

describe("ProofRouter MCP stdio server", () => {
  it("lists and calls tools over the MCP protocol", async () => {
    mkdirSync(resolve(".local/tmp"), { recursive: true });
    const transport = new StdioClientTransport({
      command: resolve("node_modules/.bin/tsx"),
      args: ["services/proofrouter-mcp/src/mcp.ts"],
      cwd: resolve("."),
      env: {
        ...process.env,
        TMPDIR: resolve(".local/tmp")
      },
      stderr: "pipe"
    });
    const client = new Client({
      name: "proofrouter-vitest",
      version: "0.1.0"
    });

    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain("proofrouter.list_proxy_offers");
      expect(tools.tools.map((tool) => tool.name)).toContain("proofrouter.submit_proof_to_cre");
      expect(tools.tools.map((tool) => tool.name)).toContain("proofrouter.settle_from_cre_report");

      const result = await client.callTool({
        name: "proofrouter.list_proxy_offers",
        arguments: {}
      });
      const firstText = result.content.find((item) => item.type === "text");
      expect(firstText?.text).toContain("offer-alpha-gpt41mini");
    } finally {
      await client.close();
    }
  }, 45_000);
});
