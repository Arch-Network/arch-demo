import path from "path"
import { defineConfig, loadEnv } from "vite"
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  let rpcUrl = env.VITE_RPC_URL || 'https://rpc-01.test.arch.network';

  // Ensure URL has proper protocol
  if (!rpcUrl.startsWith('http://') && !rpcUrl.startsWith('https://')) {
    rpcUrl = `https://${rpcUrl}`;
  }

  console.log('RPC URL:', rpcUrl);

  if (!rpcUrl || !isValidUrl(rpcUrl)) {
    throw new Error(`Invalid RPC URL: ${rpcUrl}`);
  }

  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: rpcUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.error('Proxy error:', err);
            });
          }
        }
      },
      cors: true
    }
  }
});

function isValidUrl(string: string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}