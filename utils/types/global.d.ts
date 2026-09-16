// Global type declarations for JavaScript/TypeScript compatibility

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

// Window object extensions
declare global {
  interface Window {
    agGrid?: any;
    isUpdateMode?: boolean;
    studentId?: string | number;
    updateDobFields?: { year: string; month: string; day: string };
    updateFields?: Record<string, string>;
  }

  const describe: (name: string, fn: () => void) => void;
  const it: (name: string, fn: () => void) => void;
  const test: (name: string, fn: () => void) => void;
  const expect: (actual: unknown) => {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
  };
  const jest: any;
}

export {};
