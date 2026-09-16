import { useEffect } from "react";
import { authClient } from "./auth-client";

export interface UseSessionOptions {
  required?: boolean;
  onUnauthenticated?: () => void;
}

export interface AppSession {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    role?: string | null;
    vaUserId?: string | number | null;
  } | null;
}

/**
 * Keeps the session shape used throughout the existing pages while Better Auth
 * owns session fetching and authentication.
 */
export function useSession(options: UseSessionOptions = {}): {
  data: AppSession | null;
  status: "loading" | "authenticated" | "unauthenticated";
  update: () => Promise<unknown>;
} {
  const result = authClient.useSession();
  const status = result.isPending ? "loading" : result.data ? "authenticated" : "unauthenticated";
  const required = options.required;
  const onUnauthenticated = options.onUnauthenticated;

  useEffect(() => {
    if (status === "unauthenticated" && required) {
      onUnauthenticated?.();
    }
  }, [onUnauthenticated, required, status]);

  return {
    data: result.data ?? null,
    status,
    update: result.refetch,
  };
}

export { authClient };
