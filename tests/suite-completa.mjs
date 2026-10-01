import { spawn } from 'node:child_process';
import { crearApi, espera } from '../pruebas/lib.mjs';

import paginacionTests from './integration/paginacion.test.mjs';
import creacionTests from './integration/creacion-y-reglas.test.mjs';
import edicionTests from './integration/edicion-y-borrado.test.mjs';
import ocupacionTests from './integration/ocupacion.test.mjs';

const verde = (t) => `\x1b[32m${t}\x1b[0m`;
const rojo = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;

console.log('\n[TEST SUITE] Festival Picnic 2026 - Modulo Camping\n');

// 1. Ejecutar pruebas unitarias de Use Cases con TSX
console.log(gris('--- Fase 1: Pruebas Unitarias de Use Cases ---'));

const unit = spawn('npx', ['tsx', '--test', 'tests/use-cases/*.test.ts'], {
  stdio: 'inherit',
  shell: true,
});

unit.on('close', async (code) => {
  if (code !== 0) {
    console.error(rojo('\nFallo en pruebas unitarias. Abortando ejecucion.'));
    process.exit(code ?? 1);
  }

  // 2. Ejecutar suites de integracion contra la API
  const url = process.env.API_URL || 'http://localhost:3000';
  console.log(`\n${gris(`--- Fase 2: Pruebas de Integracion contra ${url} ---`)}`);

  const api = crearApi(url);
  const ctx = {};

  const suites = [
    { nombre: 'Paginacion y Limites', pruebas: paginacionTests },
    { nombre: 'Creacion y Reglas de Negocio', pruebas: creacionTests },
    { nombre: 'Edicion y Borrado Logico', pruebas: edicionTests },
    { nombre: 'Consulta de Aforo y Ocupacion', pruebas: ocupacionTests },
  ];

  let totalAprobadas = 0;
  let totalPruebas = 0;

  for (const suite of suites) {
    console.log(`\n> ${suite.nombre} (${suite.pruebas.length})`);
    for (const p of suite.pruebas) {
      totalPruebas++;
      try {
        await p.prueba({ api, ctx, espera });
        totalAprobadas++;
        console.log(`  ${verde('✓')} ${p.nombre}`);
      } catch (e) {
        console.log(`  ${rojo('✗')} ${p.nombre}\n      ${gris(e.message)}`);
      }
    }
  }

  console.log('\n' + '-'.repeat(50));
  if (totalAprobadas === totalPruebas) {
    console.log(verde(`Resultado: ${totalAprobadas}/${totalPruebas} pruebas de integracion aprobadas.`));
    process.exit(0);
  } else {
    console.log(rojo(`Resultado: ${totalAprobadas}/${totalPruebas} aprobadas.`));
    process.exit(1);
  }
});