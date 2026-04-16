import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre de la iglesia es requerido'],
    trim: true,
  },
  slug: {
    type: String,
    required: [true, 'El slug es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
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
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'warning', 'blocked', 'cancelled'],
      default: 'active',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: Date,
    maxMembers: {
      type: Number,
      default: 500,
    },
    maxUsers: {
      type: Number,
      default: 5,
    },
  },
  settings: {
    language: {
      type: String,
      default: 'es',
    },
    timezone: {
      type: String,
      default: 'America/Bogota',
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY',
    },
    logo: String,
    colors: {
      primary: {
        type: String,
        default: '#4F46E5',
      },
      secondary: String,
    },
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
tenantSchema.index({ slug: 1 });
tenantSchema.index({ email: 1 });
tenantSchema.index({ 'subscription.status': 1 });
tenantSchema.index({ isActive: 1 });

// Middleware para soft delete
tenantSchema.methods.softDelete = function() {
  this.deletedAt = Date.now();
  this.isActive = false;
  return this.save();
};

tenantSchema.methods.restore = function() {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Método para verificar si el tenant está bloqueado
tenantSchema.methods.isBlocked = function() {
  return this.subscription.status === 'blocked';
};

const Tenant = mongoose.model('Tenant', tenantSchema);

export default Tenant;
