import { Offer, OrderMode, OrderResult } from "@0waist/schemas";

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
