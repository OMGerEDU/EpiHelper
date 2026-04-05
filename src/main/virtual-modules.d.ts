// Type declarations for Vite virtual modules used in the main process.
// The `injected-iife` plugin in electron.vite.config.ts resolves these
// imports at build time, transpiling each .ts source to a plain JS string.
declare module 'virtual:injected:*' {
  const src: string;
  export default src;
}
