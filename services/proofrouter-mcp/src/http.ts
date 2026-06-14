import { existsSync } from "node:fs";
import { resolve } from "node:path";
import cors from "cors";
import dotenv from "dotenv";
import express, { type Express } from "express";
import { getInfWalletDiagnostics } from "@0waist/hedera";
import { OrderRequestSchema } from "@0waist/schemas";
import { errorResponse } from "./errors.js";
import { approveInfAllowanceForBuyer } from "./infAllowance.js";
import { createLocalVerifierReceipt } from "./localVerifier.js";
import { openOrderViaX402 } from "./orderOpening.js";
import { listProxyOffers } from "./offers.js";
import { readPromptHistory } from "./promptHistory.js";
import { registerSellerOffer } from "./sellerRegistration.js";
import { createRefundScheduleForOrder } from "./refundSchedule.js";
import { saveAndSeedHedera } from "./setup.js";
import { getHederaActionStatus, PROOFROUTER_TOOLS } from "./tools.js";
import { executeInferenceOrder } from "./workflow.js";

for (const candidate of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  if (existsSync(candidate)) {
    dotenv.config({ path: candidate, override: false });
    break;
  }
}

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

  app.get("/api/hedera-actions", (_request, response) => {
    response.json(getHederaActionStatus());
  });

  app.get("/api/inf-wallets", async (_request, response) => {
    try {
      response.json(await getInfWalletDiagnostics());
    } catch (error) {
      const { statusCode, body } = errorResponse(error);
      response.status(statusCode).json(body);
    }
  });

  app.post("/api/inf-wallets/approve-allowance", async (request, response) => {
    try {
      const result = await approveInfAllowanceForBuyer(request.body);
      response.status(result.status === "blocked" ? 409 : 200).json(result);
    } catch (error) {
      const { statusCode, body } = errorResponse(error);
      response.status(statusCode).json(body);
    }
  });

  app.post("/api/verifier/local-receipt", async (request, response) => {
    try {
      const result = await createLocalVerifierReceipt(request.body);
      response.status(result.status === "blocked" ? 409 : 200).json(result);
    } catch (error) {
      const { statusCode, body } = errorResponse(error);
      response.status(statusCode).json(body);
    }
  });

  app.post("/api/orders/open-via-x402", async (request, response) => {
    try {
      const result = await openOrderViaX402(request.body);
      response.status(result.status === "blocked" ? 409 : 200).json(result);
    } catch (error) {
      const { statusCode, body } = errorResponse(error);
      response.status(statusCode).json(body);
    }
  });

  app.post("/api/orders/refund-schedule", async (request, response) => {
    try {
      const result = await createRefundScheduleForOrder(request.body);
      response.status(result.status === "blocked" ? 409 : 200).json(result);
    } catch (error) {
      const { statusCode, body } = errorResponse(error);
      response.status(statusCode).json(body);
    }
  });

  app.get("/api/offers", (_request, response) => {
    response.json({ offers: listProxyOffers() });
  });

  app.post("/api/seller/register", async (request, response) => {
    try {
      const result = await registerSellerOffer(request.body);
      response.status(result.status === "blocked" ? 409 : 200).json(result);
    } catch (error) {
      const { statusCode, body } = errorResponse(error);
      response.status(statusCode).json(body);
    }
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
