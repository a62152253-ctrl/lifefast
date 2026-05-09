import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      target: 'es2020',
      minify: 'esbuild',
      sourcemap: false,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'vendor-firebase-hooks': ['react-firebase-hooks/auth', 'react-firebase-hooks/firestore'],
            'vendor-motion': ['motion'],
            'vendor-date': ['date-fns'],
            'vendor-lucide': ['lucide-react'],
            'vendor-gemini': ['@google/genai'],
          },
          chunkFileNames: 'assets/[name]-[hash].js',
        },
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'motion'],
    },
    esbuild: {
      target: 'es2020',
      treeShaking: true,
      drop: ['console', 'debugger'],
    },
  };
});
