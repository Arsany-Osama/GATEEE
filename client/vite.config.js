import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

const apiProxyPaths = [
  '/auth',
  '/admin',
  '/courses',
  '/certificates',
  '/health',
  '/lessons',
  '/notifications',
  '/payment-requests',
  '/progress',
  '/quizzes',
  '/settings',
  '/streaming',
  '/student',
  '/uploads',
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || env.VITE_API_URL || 'http://localhost:5000';

  return {
    plugins: [react()],
    server: {
      proxy: Object.fromEntries(apiProxyPaths.map((path) => [
        path,
        {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      ])),
    },
  };
});
