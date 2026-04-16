import mongoose from 'mongoose';

const generatedLetterSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'El tenant ID es requerido'],
    index: true,
  },
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LetterTemplate',
    required: [true, 'La plantilla es requerida'],
  },
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: [true, 'El miembro es requerido'],
  },
  title: {
    type: String,
    required: [true, 'El título de la carta es requerido'],
    trim: true,
  },
  content: {
    type: String,
    required: [true, 'El contenido de la carta es requerido'],
  },
  variables: {
    type: Map,
    of: String,
  },
  pdfUrl: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['draft', 'generated', 'sent', 'cancelled'],
    default: 'draft',
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sentAt: Date,
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Índices para rendimiento
generatedLetterSchema.index({ tenantId: 1, member: 1 });
generatedLetterSchema.index({ tenantId: 1, template: 1 });
generatedLetterSchema.index({ tenantId: 1, status: 1 });
generatedLetterSchema.index({ tenantId: 1, createdAt: -1 });

// Método para soft delete
generatedLetterSchema.methods.softDelete = function() {
  this.deletedAt = Date.now();
  return this.save();
};

const GeneratedLetter = mongoose.model('GeneratedLetter', generatedLetterSchema);

export default GeneratedLetter;
