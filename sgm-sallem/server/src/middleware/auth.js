import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Por favor inicie sesión.',
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'El usuario no existe o ha sido eliminado.',
        });
      }

      if (!req.user.isActive || req.user.deletedAt) {
        return res.status(401).json({
          success: false,
          message: 'Su cuenta ha sido desactivada.',
        });
      }

      // Cargar tenant del usuario
      req.tenant = await Tenant.findById(req.user.tenantId);
      
      if (!req.tenant) {
        return res.status(400).json({
          success: false,
          message: 'La iglesia asociada no existe.',
        });
      }

      if (req.tenant.isBlocked()) {
        return res.status(403).json({
          success: false,
          message: 'Su iglesia está bloqueada por falta de pago. Contacte al administrador.',
        });
      }

      if (!req.tenant.isActive || req.tenant.deletedAt) {
        return res.status(403).json({
          success: false,
          message: 'Su iglesia ha sido desactivada.',
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado.',
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error en el middleware de autenticación.',
      error: error.message,
    });
  }
};

// Middleware para verificar roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Rol ${req.user.role} no autorizado para acceder a este recurso.`,
      });
    }

    next();
  };
};

// Middleware para asegurar que las consultas estén filtradas por tenant
export const filterByTenant = (modelName) => {
  return (req, res, next) => {
    if (!req.user || !req.user.tenantId) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado.',
      });
    }

    // Modificar query para incluir tenantId
    req.queryFilter = {
      tenantId: req.user.tenantId,
      deletedAt: null,
    };

    next();
  };
};

// Generar token JWT
export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h',
  });
};

// Generar refresh token
export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });
};
