import { Offer, OrderMode, OrderResult, SellerRegistrationResult } from "@0waist/schemas";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    missing?: string[];
    blockedFeature?: string;
  };
}

export async function fetchOffers(): Promise<Offer[]> {
  const response = await fetch(`${API_BASE_URL}/api/offers`);
  if (!response.ok) {
    throw new Error(`Offer request failed with HTTP ${response.status}`);
  }
  const body = await response.json() as { offers: Offer[] };
  return body.offers;
}

export interface EnsResolution {
  status: "resolved" | "unresolved" | "blocked";
  name: string;
  network: "sepolia";
  chainId: 11155111;
  displayName?: string;
  address?: string;
  avatarUrl?: string;
  resolverAddress?: string;
  source: "ethereum-sepolia";
  message: string;
}

export async function fetchEnsResolution(name: string): Promise<EnsResolution> {
  const response = await fetch(`${API_BASE_URL}/api/ens/resolve?name=${encodeURIComponent(name)}`);
  const body = await response.json();
  if (!response.ok) {
    const apiError = body as ApiErrorBody;
    throw new Error(apiError.error?.message ?? `ENS lookup failed with HTTP ${response.status}`);
  }
  return body as EnsResolution;
}

export async function createOrder(input: {
  prompt: string;
  budgetInf: number;
  mode: OrderMode;
}): Promise<OrderResult> {
  const response = await fetch(`${API_BASE_URL}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });

  const body = await response.json();
  if (!response.ok) {
    const apiError = body as ApiErrorBody;
    throw new Error(apiError.error?.message ?? `Order request failed with HTTP ${response.status}`);
  }
  return body as OrderResult;
}

export interface HederaActionStatus {
  prerequisites: {
    contracts: { ready: boolean; missing: string[] };
    inf: { ready: boolean; missing: string[] };
    dynamic: { ready: boolean; missing: string[] };
    x402: { ready: boolean; missing: string[] };
    creProof: {
      ready: boolean;
      missing: string[];
      mode: string;
      workflowId?: string;
      donId?: string;
      gatewayUrl?: string;
      target?: string;
      blockedTrust: string[];
    };
    creSettlement: {
      ready: boolean;
      missing: string[];
      shell: string;
      mode: string;
      requiredActions: string[];
    };
    sellerRegistry: { ready: boolean; missing: string[] };
  };
  actions: {
    openOrderViaX402: { ready: boolean; missing: string[]; tool: string };
    createRefundSchedule: { ready: boolean; missing: string[]; tool: string; requiredFunction: "refundExpired" };
    submitProofToCre: { ready: boolean; missing: string[]; tool: string };
    waitForCreReport: { ready: boolean; missing: string[]; tool: string };
    settleFromCreReport: { ready: boolean; missing: string[]; tool: string; shell: string; requiredActions: string[] };
    logCreSettlementAudit: { ready: boolean; missing: string[]; tool: string; requiredActions: string[] };
    publishSellerOffer: { ready: boolean; missing: string[]; tool: string };
  };
}

export async function fetchHederaActionStatus(): Promise<HederaActionStatus> {
  const response = await fetch(`${API_BASE_URL}/api/hedera-actions`);
  if (!response.ok) {
    throw new Error(`Hedera action status failed with HTTP ${response.status}`);
  }
  return await response.json() as HederaActionStatus;
}

export interface InfWalletDiagnostics {
  status: "ready" | "blocked";
  tokenId?: string;
  buyer?: {
    accountId: string;
    associated: boolean;
    balanceInf: number;
    missing: string[];
  };
  seller?: {
    accountId: string;
    associated: boolean;
    balanceInf: number;
    missing: string[];
  };
  proofEscrowAllowance?: {
    ownerAccountId: string;
    spenderAccountId: string;
    amountInf: number;
    missing: string[];
  };
  missing: string[];
}

export async function fetchInfWalletDiagnostics(): Promise<InfWalletDiagnostics> {
  const response = await fetch(`${API_BASE_URL}/api/inf-wallets`);
  if (!response.ok) {
    throw new Error(`INF wallet diagnostics failed with HTTP ${response.status}`);
  }
  return await response.json() as InfWalletDiagnostics;
}

export interface ApproveInfAllowanceResult {
  status: "submitted" | "blocked";
  missing?: string[];
  ownerAccountId?: string;
  spenderContractIdOrAddress?: string;
  tokenId?: string;
  amountInf?: number;
  transactionId?: string;
  hashScanUrl?: string;
  message: string;
}

export async function approveInfAllowance(input: {
  amountInf: number;
  confirmedOwner: boolean;
}): Promise<ApproveInfAllowanceResult> {
  const response = await fetch(`${API_BASE_URL}/api/inf-wallets/approve-allowance`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  const body = await response.json();
  if (!response.ok && body?.status !== "blocked") {
    const apiError = body as ApiErrorBody;
    throw new Error(apiError.error?.message ?? `INF allowance approval failed with HTTP ${response.status}`);
  }
  return body as ApproveInfAllowanceResult;
}

export interface HederaSetupResult {
  status: "seeded";
  topic: {
    topicId: string;
    transactionId?: string;
    hashScanUrl?: string;
  };
  manifest: {
    fileId: string;
    transactionId?: string;
    hashScanUrl?: string;
  };
  audit: {
    topicId: string;
    transactionId: string;
    hashScanUrl: string;
  };
  savedEnv: string[];
}

export async function setupHedera(input: {
  operatorId: string;
  operatorKey: string;
  auditTopicId?: string;
  marketManifestFileId?: string;
}): Promise<HederaSetupResult> {
  const response = await fetch(`${API_BASE_URL}/api/setup/hedera-seed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });

  const body = await response.json();
  if (!response.ok) {
    const apiError = body as ApiErrorBody;
    throw new Error(apiError.error?.message ?? `Hedera setup failed with HTTP ${response.status}`);
  }
  return body as HederaSetupResult;
}

export async function registerSeller(input: {
  sellerId: string;
  displayName: string;
  modelId: string;
  provider: string;
  inputPricePerMTokInf: number;
  outputPricePerMTokInf: number;
  fixedFeeInf: number;
  maxBudgetInf: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  x402Endpoint: string;
  hederaAccount: string;
  sellerEvmAddress?: string;
  sellerEnsName?: string;
  summary: string;
  publishOnChain: boolean;
}): Promise<SellerRegistrationResult> {
  const response = await fetch(`${API_BASE_URL}/api/seller/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });

  const body = await response.json();
  if (!response.ok) {
    if (body?.status === "blocked") {
      return body as SellerRegistrationResult;
    }
    const apiError = body as ApiErrorBody;
    throw new Error(apiError.error?.message ?? `Seller registration failed with HTTP ${response.status}`);
  }
  return body as SellerRegistrationResult;
}

export interface OpenEscrowOrderResult {
  status: "prepared" | "submitted" | "blocked";
  missing: string[];
  message: string;
  preparedTransaction?: {
    proofEscrowContractIdOrAddress: string;
    functionName: "openOrder";
    gas: number;
    functionParametersHex: string;
    order: {
      offerId: number;
      promptHash: string;
      requestHash: string;
      deadlineEpochSeconds: number;
    };
    x402: {
      facilitatorUrl?: string;
      network: string;
      paymentAsset: "INF";
    };
  };
  transactionId?: string;
  hashScanUrl?: string;
  orderId?: string;
  escrowEvidence?: unknown;
}

export interface RefundScheduleResult {
  status: "submitted" | "blocked";
  missing?: string[];
  message: string;
  schedule?: {
    scheduleId: string;
    transactionId: string;
    hashScanUrl: string;
    scheduledFunction: "refundExpired";
    orderId: number;
    expirationEpochSeconds: number;
  };
}

export async function openEscrowOrder(input: {
  offerId: number;
  promptHash: string;
  requestHash: string;
  deadlineEpochSeconds?: number;
  submitOnChain?: boolean;
  confirmedBuyerSigner?: boolean;
}): Promise<OpenEscrowOrderResult> {
  const response = await fetch(`${API_BASE_URL}/api/orders/open-via-x402`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });

  const body = await response.json();
  if (!response.ok && body?.status !== "blocked") {
    const apiError = body as ApiErrorBody;
    throw new Error(apiError.error?.message ?? `Escrow order request failed with HTTP ${response.status}`);
  }
  return body as OpenEscrowOrderResult;
}

export async function createRefundSchedule(input: {
  orderId: number;
  confirmedFundedOrder: boolean;
  expirationEpochSeconds?: number;
}): Promise<RefundScheduleResult> {
  const response = await fetch(`${API_BASE_URL}/api/orders/refund-schedule`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });

  const body = await response.json();
  if (!response.ok && body?.status !== "blocked") {
    const apiError = body as ApiErrorBody;
    throw new Error(apiError.error?.message ?? `Refund schedule request failed with HTTP ${response.status}`);
  }
  return body as RefundScheduleResult;
}
