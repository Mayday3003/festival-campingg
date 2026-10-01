import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('\n🧪 Festival Picnic 2026 — Suite de Pruebas Unitarias (Módulo Camping)\n');

const testPath = join(__dirname, 'use-cases', 'detalle-y-ocupacion.test.ts');

const child = spawn('npx', ['tsx', '--test', testPath], {
  stdio: 'inherit',
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});
