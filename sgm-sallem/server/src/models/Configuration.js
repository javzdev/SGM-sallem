import mongoose from 'mongoose';

const configurationSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'El tenant ID es requerido'],
    index: true,
    unique: true,
  },
  general: {
    churchName: String,
    churchLogo: String,
    churchAddress: String,
    churchPhone: String,
    churchEmail: String,
    pastorName: String,
  },
  notifications: {
    enableBirthdayNotifications: {
      type: Boolean,
      default: true,
    },
    birthdayNotificationDays: {
      type: Number,
      default: 7, // Días antes del cumpleaños
    },
    enableAnniversaryNotifications: {
      type: Boolean,
      default: true,
    },
    anniversaryNotificationDays: {
      type: Number,
      default: 7,
    },
    enableNewMemberWelcome: {
      type: Boolean,
      default: true,
    },
  },
  members: {
    requireIdentificationNumber: {
      type: Boolean,
      default: true,
    },
    allowDuplicateEmails: {
      type: Boolean,
      default: false,
    },
    autoGenerateIdentificationNumber: {
      type: Boolean,
      default: false,
    },
    identificationNumberPrefix: {
      type: String,
      default: '',
    },
  },
  letters: {
    defaultPaperSize: {
      type: String,
      enum: ['A4', 'Letter'],
      default: 'A4',
    },
    defaultFont: {
      type: String,
      default: 'Arial',
    },
    defaultFontSize: {
      type: Number,
      default: 12,
    },
    includeChurchHeader: {
      type: Boolean,
      default: true,
    },
    includeDigitalSignature: {
      type: Boolean,
      default: false,
    },
  },
  security: {
    sessionTimeout: {
      type: Number,
      default: 60, // minutos
    },
    maxLoginAttempts: {
      type: Number,
      default: 5,
    },
    lockoutDuration: {
      type: Number,
      default: 30, // minutos
    },
    requirePasswordChange: {
      type: Number,
      default: 90, // días
    },
  },
}, {
  timestamps: true,
});

// Método para obtener o crear configuración por defecto
configurationSchema.statics.getOrCreateDefault = async function(tenantId) {
  let config = await this.findOne({ tenantId });
  
  if (!config) {
    config = await this.create({
      tenantId,
      general: {},
      notifications: {
        enableBirthdayNotifications: true,
        birthdayNotificationDays: 7,
        enableAnniversaryNotifications: true,
        anniversaryNotificationDays: 7,
        enableNewMemberWelcome: true,
      },
      members: {
        requireIdentificationNumber: true,
        allowDuplicateEmails: false,
        autoGenerateIdentificationNumber: false,
        identificationNumberPrefix: '',
      },
      letters: {
        defaultPaperSize: 'A4',
        defaultFont: 'Arial',
        defaultFontSize: 12,
        includeChurchHeader: true,
        includeDigitalSignature: false,
      },
      security: {
        sessionTimeout: 60,
        maxLoginAttempts: 5,
        lockoutDuration: 30,
        requirePasswordChange: 90,
      },
    });
  }
  
  return config;
};

const Configuration = mongoose.model('Configuration', configurationSchema);

export default Configuration;
