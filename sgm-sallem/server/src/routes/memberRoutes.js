import express from 'express';
import { body, param, query } from 'express-validator';
import {
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
  restoreMember,
  importMembers,
  exportMembers,
  getMemberStats,
} from '../controllers/memberController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/error.js';

const router = express.Router();

// Validadores para creación/actualización de miembros
const memberValidators = [
  body('identificationNumber').trim().notEmpty().withMessage('El número de identificación es requerido'),
  body('firstName').trim().notEmpty().withMessage('El nombre es requerido'),
  body('lastName').trim().notEmpty().withMessage('El apellido es requerido'),
  body('dateOfBirth').isISO8601().withMessage('Fecha de nacimiento inválida'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Género inválido'),
  body('email').optional().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('phone').optional().trim(),
  body('mobilePhone').optional().trim(),
  body('membershipStatus').optional().isIn(['member', 'candidate', 'regular', 'inactive', 'removed']),
];

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas
router.route('/')
  .get(getMembers)
  .post(authorize('admin', 'manager'), memberValidators, validate, createMember);

router.get('/stats', getMemberStats);
router.get('/export', authorize('admin', 'manager'), exportMembers);
router.post('/import', authorize('admin'), importMembers);

router.route('/:id')
  .get(getMember)
  .put(authorize('admin', 'manager'), memberValidators, validate, updateMember)
  .delete(authorize('admin'), deleteMember);

router.patch('/:id/restore', authorize('admin'), restoreMember);

export default router;
