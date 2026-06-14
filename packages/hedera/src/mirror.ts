export interface SellerHistorySummary {
  sellerAccount: string;
  summary: string;
  recentTransactions: string[];
}

export async function getSellerHistorySummary(
  sellerAccount: string,
  network = "testnet"
): Promise<SellerHistorySummary> {
  const url = `https://${network}.mirrornode.hedera.com/api/v1/transactions?account.id=${encodeURIComponent(sellerAccount)}&limit=5&order=desc`;
  const response = await fetch(url);
  if (!response.ok) {
    return {
      sellerAccount,
      summary: `Mirror Node history unavailable with HTTP ${response.status}.`,
      recentTransactions: []
    };
  }

  const body = await response.json() as {
    transactions?: Array<{ transaction_id?: string; name?: string; result?: string }>;
  };
  const recentTransactions = (body.transactions ?? [])
    .map((tx) => tx.transaction_id)
    .filter((tx): tx is string => Boolean(tx));

  return {
    sellerAccount,
    summary: recentTransactions.length > 0
      ? `Mirror Node returned ${recentTransactions.length} recent transactions for seller ${sellerAccount}.`
      : `Mirror Node returned no recent transactions for seller ${sellerAccount}.`,
    recentTransactions
  };
}
