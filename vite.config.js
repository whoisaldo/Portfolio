// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // Root base for aliyounes.dev and GitHub Pages
  build: {
    // The 320px modal thumbnails land just under Vite's 4 KB inline limit, so
    // by default all 29 of them were base64'd into the entry chunk, about 107 KB
    // of images every visitor downloads before first paint, for a rail that
    // only exists inside a modal. Emit the encoded variants as real files;
    // everything else keeps Vite's default behaviour.
    assetsInlineLimit: (filePath) =>
      /-(?:320|1024|1600)\.(?:avif|webp|jpg)$/.test(filePath) ? false : undefined,
  },
})
