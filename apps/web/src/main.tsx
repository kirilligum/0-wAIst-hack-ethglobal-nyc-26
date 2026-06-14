import React from "react";
import { createRoot } from "react-dom/client";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import App from "./App.js";
import "./styles.css";

const dynamicEnvironmentId = __DYNAMIC_ENVIRONMENT_ID__;
const app = (
  <App dynamicConfigured={Boolean(dynamicEnvironmentId)} />
);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {dynamicEnvironmentId ? (
      <DynamicContextProvider
        settings={{
          environmentId: dynamicEnvironmentId,
          walletConnectors: [EthereumWalletConnectors]
        }}
      >
        {app}
      </DynamicContextProvider>
    ) : app}
  </React.StrictMode>
);
