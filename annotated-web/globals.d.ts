declare namespace process {
  const env: {
    [key: string]: string | undefined;
  };
}

declare module "@supabase/supabase-js" {
  export function createClient(url: string, key: string, options?: any): any;
}

declare module "next/link" {
  import { ReactNode } from "react";
  export default function Link(props: any): ReactNode;
}

declare module "next/navigation" {
  export function notFound(): never;
  export function useRouter(): any;
  export function usePathname(): string;
}

declare module "react" {
  const React: any;
  export default React;
  export type ReactNode = any;
}

declare module "react/jsx-runtime" {
  export const jsx: any;
  export const jsxs: any;
}
