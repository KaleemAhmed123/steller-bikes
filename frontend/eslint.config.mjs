// ESLint 9 flat config. `next lint` is deprecated in Next 15, so we lint with
// the ESLint CLI (`eslint .`) and bridge Next's shareable config via FlatCompat.
// `next/core-web-vitals` pulls in the React, React-Hooks and jsx-a11y rules —
// the a11y linting the audit (FE-012) asked for.
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: ['.next/**', 'out/**', 'next-env.d.ts', 'node_modules/**'] },
  ...compat.extends('next/core-web-vitals'),
];

export default config;
