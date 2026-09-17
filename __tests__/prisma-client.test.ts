import { prisma } from "@/lib/prisma";

describe("shared Prisma client", () => {
  it("exposes generated model delegates through the shared client", () => {
    expect(prisma).toBeDefined();
    expect(prisma.vausers).toBeDefined();
    expect(prisma.vastudents).toBeDefined();
    expect(prisma.vabatches).toBeDefined();
  });
});
