// Global type declarations for JavaScript/TypeScript compatibility

// AG Grid types
declare module "ag-grid-react" {
  export interface AgGridReactProps {
    rowData?: any[];
    columnDefs?: any[];
    defaultColDef?: any;
    onGridReady?: (params: any) => void;
    enableCellTextSelection?: boolean;
    autoSizeStrategy?: any;
    theme?: string;
    animateRows?: boolean;
    suppressCellFocus?: boolean;
    getRowStyle?: (params: any) => any;
    rowSelection?: any;
    ref?: any;
  }

  export class AgGridReact extends React.Component<AgGridReactProps> {}
}

// NextAuth Session/JWT extension
declare module "next-auth" {
  interface Session {
    blocked?: boolean;
    user?: {
      id?: number;
      role?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
    dbError?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: number;
    role?: string;
    blocked?: boolean;
    dbError?: boolean;
  }
}

// Window object extensions
declare global {
  interface Window {
    agGrid?: any;
  }
}

export {};
