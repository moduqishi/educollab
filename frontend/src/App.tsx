import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { routes } from '@/routes';
import { AuthProvider } from '@/app/auth';
import { ApiProvider } from '@/app/api';
import { QueryProvider } from '@/app/query';
import { setTitle } from '@/app/title';

export default function App() {
  React.useEffect(() => {
    // 首屏默认标题（路由页会覆盖为更具体的标题）
    setTitle([]);
  }, []);
  return (
    <QueryProvider>
      <AuthProvider>
        <ApiProvider>
          <RouterProvider router={routes} />
        </ApiProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
