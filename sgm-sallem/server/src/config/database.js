import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || 'sgm_sallem',
    });

    console.log(`MongoDB Conectado: ${conn.connection.host}`);
    
    // Crear índices para multi-tenant y rendimiento
    await createIndexes();
    
    return conn;
  } catch (error) {
    console.error(`Error de conexión a MongoDB: ${error.message}`);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // Los índices se crean automáticamente en los schemas con index: true
    console.log('Índices creados exitosamente');
  } catch (error) {
    console.error('Error creando índices:', error);
  }
};

export default connectDB;
