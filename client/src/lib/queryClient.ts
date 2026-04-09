export async function apiRequest(method: string, url: string) {
  return fetch(url, { method });
}

import { QueryClient } from "@tanstack/react-query";
export const queryClient = new QueryClient();
