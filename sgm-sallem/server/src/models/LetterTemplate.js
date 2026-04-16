import mongoose from 'mongoose';

const letterTemplateSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'El tenant ID es requerido'],
    index: true,
  },
  name: {
    type: String,
    required: [true, 'El nombre de la plantilla es requerido'],
    trim: true,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  category: {
    type: String,
    enum: ['certificate', 'recommendation', 'transfer', 'invitation', 'announcement', 'other'],
    default: 'other',
  },
  content: {
    type: String,
    required: [true, 'El contenido de la plantilla es requerido'],
  },
  variables: [{
    name: {
      type: String,
      required: true,
    },
    description: String,
    defaultValue: String,
    required: {
      type: Boolean,
      default: false,
    },
  }],
  isSystem: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Índices para rendimiento
letterTemplateSchema.index({ tenantId: 1, name: 1 });
letterTemplateSchema.index({ tenantId: 1, category: 1 });
letterTemplateSchema.index({ tenantId: 1, isSystem: 1 });

// Método para soft delete
letterTemplateSchema.methods.softDelete = function() {
  this.deletedAt = Date.now();
  this.isActive = false;
  return this.save();
};

letterTemplateSchema.methods.restore = function() {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

const LetterTemplate = mongoose.model('LetterTemplate', letterTemplateSchema);

export default LetterTemplate;
