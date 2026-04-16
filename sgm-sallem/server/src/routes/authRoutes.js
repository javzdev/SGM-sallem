import express from 'express';
import { body, param, query } from 'express-validator';
import {
  registerTenant,
  login,
  getMe,
  updateProfile,
  changePassword,
  refreshToken,
  logout,
} from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/error.js';

const router = express.Router();

// Validadores para registro de tenant
const registerTenantValidators = [
  body('name').trim().notEmpty().withMessage('El nombre de la iglesia es requerido'),
  body('slug').trim().notEmpty().withMessage('El slug es requerido').isAlpha('es-ES').withMessage('El slug solo puede contener letras'),
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('adminUser.email').isEmail().withMessage('Email del administrador inválido').normalizeEmail(),
  body('adminUser.password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('adminUser.firstName').trim().notEmpty().withMessage('El nombre del administrador es requerido'),
  body('adminUser.lastName').trim().notEmpty().withMessage('El apellido del administrador es requerido'),
];

// Validadores para login
const loginValidators = [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
];

// Rutas públicas
router.post('/register-tenant', registerTenantValidators, validate, registerTenant);
router.post('/login', loginValidators, validate, login);

// Rutas protegidas
router.use(protect);

router.get('/me', getMe);
router.put('/update-profile',
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('phone').optional().trim(),
  validate,
  updateProfile
);
router.put('/change-password',
  body('currentPassword').notEmpty().withMessage('La contraseña actual es requerida'),
  body('newPassword').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
  validate,
  changePassword
);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

export default router;
