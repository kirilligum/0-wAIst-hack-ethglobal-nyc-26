export interface AgentKitReadiness {
  ready: boolean;
  note: string;
}

export function agentKitReadiness(): AgentKitReadiness {
  return {
    ready: false,
    note: "Hedera Agent Kit action wiring is not complete in the minimal scanner slice."
  };
}
