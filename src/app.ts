import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import reservaCampingRoutes from './interface/http/routes/reservaCampingRoutes.js';

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', microservice: 'camping' });
});

// Montar rutas del módulo camping
app.use('/api/reservas-camping', reservaCampingRoutes);

// Manejo general de rutas no encontradas (404 estructurado según CONVENCIONES §2)
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Middleware de manejo global de errores: previene fugas de stack trace (§2 CONVENCIONES)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = typeof err.status === 'number' ? err.status : 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor',
  });
});

const PORT = Number(process.env.PORT) || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Festival Camping corriendo en el puerto ${PORT}`);
  });
}
