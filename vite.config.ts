import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Яндекс раздаёт игру из подпапки CDN (/<appId>/<hash>/),
  // поэтому ассеты должны ссылаться относительно страницы, иначе 404 и белый экран.
  base: './',
  plugins: [react()],
})
