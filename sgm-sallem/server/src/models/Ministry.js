import mongoose from 'mongoose';

const ministrySchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'El tenant ID es requerido'],
    index: true,
  },
  name: {
    type: String,
    required: [true, 'El nombre del ministerio es requerido'],
    trim: true,
  },
  description: {
    type: String,
    maxlength: 1000,
  },
  category: {
    type: String,
    enum: ['worship', 'teaching', 'evangelism', 'children', 'youth', 'men', 'women', 'social', 'prayer', 'media', 'administration', 'other'],
    default: 'other',
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
  },
  coLeader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
  },
  meetingSchedule: {
    dayOfWeek: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
    time: String,
    location: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  color: {
    type: String,
    default: '#4F46E5',
  },
  icon: String,
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Índices para rendimiento
ministrySchema.index({ tenantId: 1, name: 1 });
ministrySchema.index({ tenantId: 1, category: 1 });
ministrySchema.index({ tenantId: 1, isActive: 1 });

// Método para soft delete
ministrySchema.methods.softDelete = function() {
  this.deletedAt = Date.now();
  this.isActive = false;
  return this.save();
};

ministrySchema.methods.restore = function() {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

const Ministry = mongoose.model('Ministry', ministrySchema);

export default Ministry;
