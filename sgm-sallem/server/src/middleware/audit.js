import AuditLog from '../models/AuditLog.js';

export const logAction = async (req, action, entity, entityId, changes = {}, description = '') => {
  try {
    await AuditLog.create({
      tenantId: req.user.tenantId,
      action,
      entity,
      entityId,
      user: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      changes,
      description,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  } catch (error) {
    console.error('Error creando log de auditoría:', error);
    // No fallar la solicitud principal si falla el log
  }
};

// Middleware para registrar acciones automáticamente
export const auditMiddleware = (entity) => {
  return async (req, res, next) => {
    // Guardar referencia al método json original
    const originalJson = res.json;
    
    // Sobrescribir el método json para capturar la respuesta
    res.json = function(data) {
      // Determinar acción basada en el método HTTP y estado
      let action = 'view';
      if (req.method === 'POST') action = 'create';
      else if (req.method === 'PUT' || req.method === 'PATCH') action = 'update';
      else if (req.method === 'DELETE') action = 'delete';
      
      // Solo loguear si la respuesta es exitosa
      if (data && data.success !== false && req.params.id) {
        const entityId = req.params.id;
        logAction(req, action, entity, entityId, {
          before: req.bodyBefore || null,
          after: req.body,
        });
      }
      
      // Restaurar el método original y llamarlo
      res.json = originalJson;
      return res.json.call(this, data);
    };
    
    // Guardar body antes de modificaciones
    req.bodyBefore = req.body ? JSON.parse(JSON.stringify(req.body)) : null;
    
    next();
  };
};
