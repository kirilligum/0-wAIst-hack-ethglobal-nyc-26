import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { KeyRound, Wallet } from "lucide-react";

interface DynamicWalletPanelProps {
  configured: boolean;
}

function compactAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

function DynamicConnectedPanel() {
  const { primaryWallet, sdkHasLoaded, user } = useDynamicContext();
  const walletAddress = primaryWallet?.address;
  const status = !sdkHasLoaded
    ? "Loading Dynamic..."
    : walletAddress
    ? `Connected ${compactAddress(walletAddress)}`
    : "Login or connect a wallet";

  return (
    <section className="dynamic-strip">
      <div className="dynamic-copy">
        <strong>Dynamic wallet</strong>
        <span>{status}</span>
      </div>
      <div className="dynamic-widget">
        <DynamicWidget />
      </div>
      {walletAddress ? (
        <div className="dynamic-details">
          <span>
            <Wallet size={15} />
            {compactAddress(walletAddress)}
          </span>
          {primaryWallet?.chain ? (
            <span>
              <KeyRound size={15} />
              Chain {String(primaryWallet.chain)}
            </span>
          ) : null}
          {user?.email ? <span>{user.email}</span> : null}
        </div>
      ) : null}
    </section>
  );
}

export function DynamicWalletPanel({ configured }: DynamicWalletPanelProps) {
  if (!configured) {
    return (
      <section className="dynamic-strip blocked-dynamic">
        <div className="dynamic-copy">
          <strong>Dynamic wallet</strong>
          <span>Set VITE_DYNAMIC_ENVIRONMENT_ID or DYNAMIC_ENVIRONMENT_ID to enable login.</span>
        </div>
      </section>
    );
  }

  return <DynamicConnectedPanel />;
}
