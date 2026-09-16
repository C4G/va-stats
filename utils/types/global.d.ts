// Global type declarations for JavaScript/TypeScript compatibility

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

// Window object extensions
declare global {
  interface Window {
    agGrid?: { licenseManager?: Record<string, unknown> };
    isUpdateMode?: boolean;
    studentId?: string | number;
    updateDobFields?: { year: string; month: string; day: string } | null;
    updateFields?: Record<string, string> | null;
  }
}

export {};
