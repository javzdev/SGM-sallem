import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'El tenant ID es requerido'],
    index: true,
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Por favor ingrese un email válido'],
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false,
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
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'manager', 'viewer'],
    default: 'viewer',
  },
  phone: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
    default: null,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  verificationTokenExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: Date,
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Índices compuestos para rendimiento
userSchema.index({ tenantId: 1, email: 1 });
userSchema.index({ tenantId: 1, role: 1 });
userSchema.index({ tenantId: 1, isActive: 1 });

// Hash de contraseña antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Método para verificar si la cuenta está bloqueada
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Método para incrementar intentos fallidos
userSchema.methods.incFailedAttempts = function() {
  this.failedLoginAttempts += 1;
  const maxAttempts = 5;
  const lockTime = 30 * 60 * 1000; // 30 minutos
  
  if (this.failedLoginAttempts >= maxAttempts) {
    this.lockUntil = Date.now() + lockTime;
  }
  return this.save();
};

// Método para resetear intentos fallidos
userSchema.methods.resetFailedAttempts = function() {
  this.failedLoginAttempts = 0;
  this.lockUntil = undefined;
  return this.save();
};

// Método para soft delete
userSchema.methods.softDelete = function() {
  this.deletedAt = Date.now();
  this.isActive = false;
  return this.save();
};

userSchema.methods.restore = function() {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

const User = mongoose.model('User', userSchema);

export default User;
