import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import reservaCampingRoutes from './interface/http/routes/reservaCampingRoutes.js';

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json());

// Montar rutas del módulo camping
app.use('/api/reservas-camping', reservaCampingRoutes);

// Manejo general de rutas no encontradas
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = Number(process.env.PORT) || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Festival Camping corriendo en el puerto ${PORT}`);
  });
}
