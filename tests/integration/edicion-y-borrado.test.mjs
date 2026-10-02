const R = '/api/reservas-camping';

export default [
  {
    nombre: 'PATCH with non-editable field responds 400',
    prueba: async ({ api, ctx, espera }) =>
      espera.error(await api.patch(`${R}/${ctx.extra}`, { asistente_id: 1 }), 400),
  },
  {
    nombre: 'Cleanup: delete twice gives 200 then 404',
    prueba: async ({ api, ctx, espera }) => {
      espera.status(await api.del(`${R}/${ctx.extra}`), 200);
      espera.error(await api.del(`${R}/${ctx.extra}`), 404);
    },
  },
];
