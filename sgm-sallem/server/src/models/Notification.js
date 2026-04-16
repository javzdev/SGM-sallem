import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'El tenant ID es requerido'],
    index: true,
  },
  type: {
    type: String,
    enum: ['birthday', 'anniversary', 'new_member', 'ministry_assignment', 'payment_warning', 'general', 'system'],
    required: [true, 'El tipo de notificación es requerido'],
  },
  title: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true,
    maxlength: 200,
  },
  message: {
    type: String,
    required: [true, 'El mensaje es requerido'],
    maxlength: 1000,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  recipients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  relatedMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
  },
  relatedMinistry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ministry',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: Date,
  readBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  scheduledFor: {
    type: Date,
    default: Date.now,
  },
  expiresAt: Date,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Índices para rendimiento
notificationSchema.index({ tenantId: 1, recipient: 1, isRead: 1 });
notificationSchema.index({ tenantId: 1, type: 1 });
notificationSchema.index({ tenantId: 1, priority: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ scheduledFor: 1 });

// Método para marcar como leída
notificationSchema.methods.markAsRead = function(userId) {
  this.isRead = true;
  this.readAt = Date.now();
  this.readBy = userId;
  return this.save();
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
