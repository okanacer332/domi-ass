/// <reference types="vite/client" />

import type { DomizanApi } from "../../shared/contracts";

declare global {
  interface Window {
    domizanApi: DomizanApi;
  }
}

export {};
