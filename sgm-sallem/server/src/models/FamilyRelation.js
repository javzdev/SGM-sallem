import mongoose from 'mongoose';

const familyRelationSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'El tenant ID es requerido'],
    index: true,
  },
  memberFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: [true, 'El miembro de origen es requerido'],
    index: true,
  },
  memberTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: [true, 'El miembro destino es requerido'],
    index: true,
  },
  relationshipType: {
    type: String,
    enum: ['spouse', 'parent', 'child', 'sibling'],
    required: [true, 'El tipo de relación es requerido'],
  },
  isPrimary: {
    type: Boolean,
    default: false,
  },
  notes: String,
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Índices compuestos para evitar duplicados y mejorar rendimiento
familyRelationSchema.index({ tenantId: 1, memberFrom: 1, memberTo: 1 }, { unique: true });
familyRelationSchema.index({ tenantId: 1, memberFrom: 1, relationshipType: 1 });
familyRelationSchema.index({ tenantId: 1, memberTo: 1, relationshipType: 1 });

// Validación para evitar auto-relaciones
familyRelationSchema.pre('save', function(next) {
  if (this.memberFrom.toString() === this.memberTo.toString()) {
    const error = new Error('No se puede crear una relación de un miembro consigo mismo');
    error.name = 'ValidationError';
    return next(error);
  }
  next();
});

// Método para obtener la relación inversa
familyRelationSchema.methods.getInverseRelationship = function() {
  const inverseMap = {
    spouse: 'spouse',
    parent: 'child',
    child: 'parent',
    sibling: 'sibling',
  };
  return inverseMap[this.relationshipType];
};

const FamilyRelation = mongoose.model('FamilyRelation', familyRelationSchema);

export default FamilyRelation;
