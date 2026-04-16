import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'El tenant ID es requerido'],
    index: true,
  },
  identificationNumber: {
    type: String,
    required: [true, 'El número de identificación es requerido'],
    trim: true,
    uppercase: true,
  },
  firstName: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'El apellido es requerido'],
    trim: true,
  },
  secondLastName: {
    type: String,
    trim: true,
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'La fecha de nacimiento es requerida'],
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: [true, 'El género es requerido'],
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Por favor ingrese un email válido'],
  },
  phone: {
    type: String,
    trim: true,
  },
  mobilePhone: {
    type: String,
    trim: true,
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: {
      type: String,
      default: 'Colombia',
    },
    postalCode: String,
  },
  photo: {
    type: String,
    default: null,
  },
  // Datos eclesiales
  baptismDate: Date,
  baptismPlace: String,
  membershipDate: Date,
  membershipStatus: {
    type: String,
    enum: ['member', 'candidate', 'regular', 'inactive', 'removed'],
    default: 'candidate',
  },
  spiritualGifts: [String],
  ministries: [{
    ministry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ministry',
    },
    role: {
      type: String,
      default: 'member',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
  }],
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    email: String,
  },
  notes: {
    type: String,
    maxlength: 2000,
  },
  tags: [String],
  maritalStatus: {
    type: String,
    enum: ['single', 'married', 'divorced', 'widowed', 'in_relationship'],
    default: 'single',
  },
  spouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
  },
  occupation: String,
  workplace: String,
  educationLevel: {
    type: String,
    enum: ['primary', 'secondary', 'technical', 'university', 'postgraduate', 'other'],
  },
  bloodType: String,
  allergies: [String],
  medicalConditions: [String],
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

// Índices compuestos para rendimiento y unicidad
memberSchema.index({ tenantId: 1, identificationNumber: 1 }, { unique: true });
memberSchema.index({ tenantId: 1, email: 1 });
memberSchema.index({ tenantId: 1, firstName: 1, lastName: 1 });
memberSchema.index({ tenantId: 1, membershipStatus: 1 });
memberSchema.index({ tenantId: 1, ministries: 1 });
memberSchema.index({ tenantId: 1, dateOfBirth: 1 });

// Validación de cédula única por tenant
memberSchema.path('identificationNumber').validate(async function(value) {
  if (!this.isModified('identificationNumber')) return true;
  
  const count = await this.constructor.countDocuments({
    tenantId: this.tenantId,
    identificationNumber: value,
    _id: { $ne: this._id },
    deletedAt: null,
  });
  
  return count === 0;
}, 'Ya existe un miembro con este número de identificación en esta iglesia');

// Método para soft delete
memberSchema.methods.softDelete = function() {
  this.deletedAt = Date.now();
  this.isActive = false;
  return this.save();
};

memberSchema.methods.restore = function() {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Método para obtener edad
memberSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Método para verificar si es cumpleaños hoy
memberSchema.virtual('isBirthdayToday').get(function() {
  if (!this.dateOfBirth) return false;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  return today.getDate() === birthDate.getDate() && 
         today.getMonth() === birthDate.getMonth();
});

const Member = mongoose.model('Member', memberSchema);

export default Member;
