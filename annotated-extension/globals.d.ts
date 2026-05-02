declare namespace chrome {}
declare namespace process {
  const env: {
    [key: string]: string | undefined;
  };
}

// Basic types to satisfy IDE if @types fail
declare module "@supabase/supabase-js" {
  export function createClient(url: string, key: string, options?: any): any;
}

declare module "react" {
  const React: any;
  export default React;
  export const useState: any;
  export const useEffect: any;
  export const useMemo: any;
  export const useCallback: any;
  export type ChangeEvent<T> = any;
}

declare module "react-dom" {
  const ReactDOM: any;
  export default ReactDOM;
}
