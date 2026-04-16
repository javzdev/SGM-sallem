import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import hpp from 'hpp';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import { errorHandler, sanitizeInput } from './middleware/error.js';

// Cargar variables de entorno
dotenv.config();

// Importar rutas
import authRoutes from './routes/authRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import letterRoutes from './routes/letterRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import ministryRoutes from './routes/ministryRoutes.js';

// Crear aplicación Express
const app = express();

// Conectar a MongoDB
connectDB();

// Inicializar trabajos programados (notificaciones automáticas)
import { initializeScheduledJobs } from './services/notificationService.js';
initializeScheduledJobs();

// Middleware de seguridad
app.use(helmet()); // Headers HTTP seguros

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 requests por ventana
  message: {
    success: false,
    message: 'Demasiadas solicitudes, por favor intente más tarde.',
  },
});
app.use('/api', limiter);

// Middlewares de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitización de inputs
app.use(sanitizeInput);

// Prevenir contaminación de parámetros
app.use(hpp());

// Prevenir XSS
app.use(xss());

// Compresión de respuestas
app.use(compression());

// Logging en desarrollo
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rutas de la API
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/members', memberRoutes);
app.use('/api/v1/templates', letterRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/ministries', ministryRoutes);

// Ruta de salud
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SGM-Sallem API está funcionando correctamente',
    timestamp: new Date().toISOString(),
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bienvenido a SGM-Sallem API v1',
    documentation: '/api-docs',
  });
});

// Manejo de rutas no encontradas
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.originalUrl} no encontrada`,
  });
});

// Manejo global de errores
app.use(errorHandler);

// Iniciar servidor
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
    ╔════════════════════════════════════════════╗
    ║     SGM-Sallem Server                      ║
    ║     Sistema de Gestión de Iglesia          ║
    ╠════════════════════════════════════════════╣
    ║  Puerto: ${PORT}                              ║
    ║  Entorno: ${process.env.NODE_ENV || 'development'}                          ║
    ║  API: http://localhost:${PORT}/api/v1         ║
    ╚════════════════════════════════════════════╝
  `);
});

// Manejo de cierre graceful
process.on('unhandledRejection', (err, promise) => {
  console.error(`Error: ${err.message}`);
  server.close(() => {
    console.log('Servidor cerrado debido a error no manejado');
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('Señal SIGTERM recibida. Cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado exitosamente');
    process.exit(0);
  });
});

export default app;
