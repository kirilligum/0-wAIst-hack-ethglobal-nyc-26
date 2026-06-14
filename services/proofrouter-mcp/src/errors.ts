import { ZodError } from "zod";

export class CredentialBlocker extends Error {
  readonly statusCode = 424;

  constructor(
    message: string,
    readonly missing: string[],
    readonly blockedFeature: string
  ) {
    super(message);
  }
}

export function errorResponse(error: unknown): {
  statusCode: number;
  body: { error: { code: string; message: string; missing?: string[]; blockedFeature?: string } };
} {
  if (error instanceof CredentialBlocker) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: "credential_blocker",
          message: error.message,
          missing: error.missing,
          blockedFeature: error.blockedFeature
        }
      }
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      body: {
        error: {
          code: "invalid_request",
          message: error.issues.map((issue) => issue.message).join("; ")
        }
      }
    };
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return {
    statusCode: 500,
    body: {
      error: {
        code: "internal_error",
        message
      }
    }
  };
}
