import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  compatibilityDate: '2026-04-13',
  ignore: ['**/*.test.*'],
  scanDirs: ['server'],
  publicAssets: [
    {
      dir: 'public',
    },
    {
      dir: '.client-dist',
      baseURL: '/',
    },
  ],
})
