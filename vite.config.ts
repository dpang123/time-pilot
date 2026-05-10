import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  },
  server: {
    host: true,
    port: 5173,
    // The project lives on a network drive (Google Drive / NAS share). Native
    // file events don't always fire there, so fall back to polling so HMR /
    // full-reload works reliably.
    watch: {
      usePolling: true,
      interval: 400,
    },
  },
});
