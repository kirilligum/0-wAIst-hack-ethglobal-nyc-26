import "dotenv/config";
import cors from "cors";
import express, { type Express } from "express";
import { OrderRequestSchema } from "@0waist/schemas";
import { errorResponse } from "./errors.js";
import { listProxyOffers } from "./offers.js";
import { readPromptHistory } from "./promptHistory.js";
import { saveAndSeedHedera } from "./setup.js";
import { PROOFROUTER_TOOLS } from "./tools.js";
import { executeInferenceOrder } from "./workflow.js";

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "proofrouter-mcp",
      tools: PROOFROUTER_TOOLS.length
    });
  });

  app.get("/api/tools", (_request, response) => {
    response.json({ tools: PROOFROUTER_TOOLS });
  });

  app.get("/api/offers", (_request, response) => {
    response.json({ offers: listProxyOffers() });
  });

  app.get("/api/prompt-history", async (_request, response) => {
    response.json(await readPromptHistory());
  });

  app.post("/api/orders", async (request, response) => {
    try {
      const orderRequest = OrderRequestSchema.parse(request.body);
      const result = await executeInferenceOrder(orderRequest);
      response.json(result);
    } catch (error) {
      const { statusCode, body } = errorResponse(error);
      response.status(statusCode).json(body);
    }
  });

  app.post("/api/setup/hedera-seed", async (request, response) => {
    try {
      const result = await saveAndSeedHedera(request.body);
      response.json(result);
    } catch (error) {
      const { statusCode, body } = errorResponse(error);
      response.status(statusCode).json(body);
    }
  });

  return app;
}

const isEntryPoint = process.argv[1]?.endsWith("http.ts") || process.argv[1]?.endsWith("http.js");
if (isEntryPoint) {
  const port = Number(process.env.PORT ?? 8787);
  createApp().listen(port, "0.0.0.0", () => {
    console.log(`ProofRouter service listening on http://localhost:${port}`);
  });
}
