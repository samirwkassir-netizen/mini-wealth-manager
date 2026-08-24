import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Builds one self-contained file that opens by double-clicking, with no
// server. Classic IIFE rather than an ES module, because Chrome blocks
// module scripts on the file:// protocol.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist-single',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: { format: 'iife', inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: 'app.[ext]' },
    },
  },
})
