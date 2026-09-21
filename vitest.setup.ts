import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next/router", () => ({
  useRouter() {
    return {
      route: "/",
      pathname: "/",
      query: {},
      asPath: "/",
      push: vi.fn(),
      pop: vi.fn(),
      reload: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn().mockResolvedValue(undefined),
      beforePopState: vi.fn(),
      events: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
      },
      isFallback: false,
    };
  },
}));

vi.mock("@/lib/auth-client-compat", () => ({
  useSession: () => ({
    data: {
      user: {
        email: "test@example.com",
        name: "Test User",
      },
    },
    status: "authenticated",
  }),
  authClient: {
    signOut: vi.fn(),
    signIn: { email: vi.fn(), social: vi.fn(), passkey: vi.fn() },
    signUp: { email: vi.fn() },
  },
}));

global.fetch = vi.fn();

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
