const R = '/api/reservas-camping';

export default [
  {
    nombre: 'Ocupacion en zona que no es camping responde 400',
    prueba: async ({ api, espera }) => espera.error(await api.get(`${R}/zona/3/ocupacion`), 400),
  },
  {
    nombre: 'Ocupacion en zona inexistente responde 404',
    prueba: async ({ api, espera }) => espera.error(await api.get(`${R}/zona/999999/ocupacion`), 404),
  },
  {
    nombre: 'Ocupacion con id invalido de zona responde 400',
    prueba: async ({ api, espera }) => espera.error(await api.get(`${R}/zona/abc/ocupacion`), 400),
  },
];
