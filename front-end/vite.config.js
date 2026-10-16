import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{
            name: "vendor",
            test: /node_modules/,
            minSize: 100_000,
            maxSize: 300_000,
            priority: 10,
          }],
        },
      },
    },
  },
})
