import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Svelte-слой собирается в один файл app/bundle.js (+ app/bundle.css).
// Легаси index.html подключает его как обычный <script defer>; все модули
// регистрируются на window (window.FINANCE и т.д.) с прежним API, так что
// старый код ничего не замечает. По мере переноса вкладок старые файлы
// в src/js удаляются.
export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: 'app',
    emptyOutDir: true,
    cssCodeSplit: false,
    target: 'es2020',
    lib: {
      entry: 'src/svelte/main.js',
      name: 'LT',
      formats: ['iife'],
      fileName: () => 'bundle.js',
    },
    rollupOptions: {
      output: { assetFileNames: 'bundle[extname]' },
    },
  },
});
