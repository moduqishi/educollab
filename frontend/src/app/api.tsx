import React from 'react';
import { createApiClient } from '@/lib/api';
import { useAuth } from '@/app/auth';

const ApiContext = React.createContext<ReturnType<typeof createApiClient> | null>(null);

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { token, logout } = useAuth();

  const api = React.useMemo(
    () =>
      createApiClient({
        getToken: () => token,
        onUnauthorized: () => logout(),
      }),
    [token, logout],
  );

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi() {
  const api = React.useContext(ApiContext);
  if (!api) throw new Error('useApi 必须在 ApiProvider 内使用');
  return api;
}

