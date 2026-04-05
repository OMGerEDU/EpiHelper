import { resolve } from 'path';
import fs from 'fs';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { transformWithEsbuild } from 'vite';

/**
 * Resolves `virtual:injected:<name>` imports in the main-process build.
 * Each injected TypeScript file is transpiled to plain JS (type-stripped only,
 * preserving the existing IIFE wrapper) and exported as a default string so
 * CDP can inject the source verbatim into web pages.
 */
function injectedIifePlugin(): Plugin {
  const VIRTUAL_PREFIX = 'virtual:injected:';
  const RESOLVED_PREFIX = '\0virtual:injected:';

  return {
    name: 'injected-iife',
    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        return RESOLVED_PREFIX + id.slice(VIRTUAL_PREFIX.length);
      }
    },
    async load(id) {
      if (!id.startsWith(RESOLVED_PREFIX)) return;
      const name = id.slice(RESOLVED_PREFIX.length);
      const filepath = resolve(`src/injected/${name}.ts`);
      const code = fs.readFileSync(filepath, 'utf8');
      // Strip TypeScript only — keep the existing IIFE structure intact.
      const result = await transformWithEsbuild(code, filepath, {
        loader: 'ts',
        target: 'es2020',
      });
      return `export default ${JSON.stringify(result.code)}`;
    },
  };
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), injectedIifePlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts'),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          'chrome-preload': resolve('src/preload/chrome-preload.ts'),
        },
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@renderer': resolve('src/renderer'),
      },
    },
    plugins: [react()],
    root: resolve('src/renderer'),
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/renderer/index.html'),
        },
      },
    },
  },
});
