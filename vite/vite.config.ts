import basicSsl from '@vitejs/plugin-basic-ssl';

// Point at the Sinequa backend to proxy API + SignalR traffic during local development.
// Adjust to your instance (the local dev instance runs on http://localhost).
const API_URL = 'http://localhost';
const ROOT = '../dist/agent-element/browser';

export default {
  root: ROOT,
  plugins: [basicSsl()],
  server: {
    // No `https` entry on purpose: basicSsl() injects its self-signed certificate whenever
    // `server.https` is unset, so the harness serves https://localhost:4200 (an explicit
    // `https: false` would win over the plugin and silently downgrade to plain http).
    // No `open` either: the npm script runs `vite --no-open` and the CLI flag wins.
    port: 4200,
    host: true,
    proxy: {
      '/api': {
        target: API_URL,
        secure: false,
        changeOrigin: true
      },
      '/xdownload': {
        target: API_URL,
        secure: false,
        changeOrigin: true
      },
      '/endpoints': {
        target: API_URL,
        secure: false,
        changeOrigin: true,
        ws: true
      },
      '/auth/redirect': {
        target: API_URL,
        secure: false,
        changeOrigin: true
      }
    }
  }
};
