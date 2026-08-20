import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";
import { customSessionClient } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  plugins: [passkeyClient(), customSessionClient<typeof auth>()],
  // Never leave route guards in a permanent loading state if the auth API or
  // database connection is unavailable.
  fetchOptions: {
    timeout: 10000,
  },
  sessionOptions: {
    refetchInterval: 0,
    refetchOnWindowFocus: false,
  },
});
