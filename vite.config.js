import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // ONNX Runtime (face check) loads its own WebAssembly file; Vite's
  // dependency pre-bundling would break the path to it in `npm run dev`.
  optimizeDeps: { exclude: ['onnxruntime-web'] },
});
