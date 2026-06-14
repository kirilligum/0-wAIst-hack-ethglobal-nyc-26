import { createSellerApp } from "./server.js";

export * from "./server.js";

const isEntryPoint = process.argv[1]?.endsWith("index.ts") || process.argv[1]?.endsWith("index.js");
if (isEntryPoint) {
  const port = Number(process.env.SELLER_PORT ?? 8790);
  createSellerApp().listen(port, "0.0.0.0", () => {
    console.log(`0-wAIst seller node listening on http://localhost:${port}`);
  });
}
