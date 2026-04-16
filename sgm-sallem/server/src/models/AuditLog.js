import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'El tenant ID es requerido'],
    index: true,
  },
  action: {
    type: String,
    required: [true, 'La acción es requerida'],
    enum: ['create', 'update', 'delete', 'restore', 'login', 'logout', 'export', 'import', 'view', 'other'],
  },
  entity: {
    type: String,
    required: [true, 'La entidad es requerida'],
    enum: ['tenant', 'user', 'member', 'ministry', 'family_relation', 'letter_template', 'generated_letter', 'notification', 'configuration', 'other'],
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Índices para rendimiento y retención
auditLogSchema.index({ tenantId: 1, entity: 1, entityId: 1 });
auditLogSchema.index({ tenantId: 1, user: 1 });
auditLogSchema.index({ tenantId: 1, action: 1 });
auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 }); // 12 meses de retención

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
