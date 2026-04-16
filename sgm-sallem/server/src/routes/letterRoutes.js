import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { filterByTenant } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/audit.js';
import * as letterService from '../services/letterService.js';

const router = express.Router();

// Todas las rutas están protegidas y requieren autenticación
router.use(protect);
router.use(filterByTenant('LetterTemplate'));

// @route   POST /api/v1/templates
// @desc    Crear nueva plantilla
// @access  Private (Admin, Manager)
router.post('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const result = await letterService.createTemplate(req.user.tenantId, req.body);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/v1/templates
// @desc    Obtener todas las plantillas
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    const filters = {
      category: req.query.category,
      isActive: req.query.isActive === 'true',
      isSystem: req.query.isSystem === 'true',
    };

    const result = await letterService.getTemplates(req.user.tenantId, filters);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/v1/templates/:id
// @desc    Obtener plantilla por ID
// @access  Private
router.get('/:id', async (req, res, next) => {
  try {
    const result = await letterService.getTemplateById(req.user.tenantId, req.params.id);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/v1/templates/:id
// @desc    Actualizar plantilla
// @access  Private (Admin, Manager)
router.put('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const result = await letterService.updateTemplate(req.user.tenantId, req.params.id, req.body);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/v1/templates/:id/duplicate
// @desc    Duplicar plantilla del sistema
// @access  Private (Admin, Manager)
router.post('/:id/duplicate', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const result = await letterService.duplicateTemplate(req.user.tenantId, req.params.id);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/v1/templates/:id
// @desc    Eliminar plantilla
// @access  Private (Admin)
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const result = await letterService.deleteTemplate(req.user.tenantId, req.params.id);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/v1/templates/generate
// @desc    Generar carta individual
// @access  Private (Admin, Manager)
router.post('/generate', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const result = await letterService.generateLetter(req.user.tenantId, req.user._id, req.body);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/v1/templates/generate-bulk
// @desc    Generar cartas masivas
// @access  Private (Admin, Manager)
router.post('/generate-bulk', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const result = await letterService.generateBulkLetters(req.user.tenantId, req.user._id, req.body);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/v1/templates/history
// @desc    Obtener historial de cartas generadas
// @access  Private
router.get('/history', async (req, res, next) => {
  try {
    const filters = {
      memberId: req.query.memberId,
      templateId: req.query.templateId,
      status: req.query.status,
    };

    const result = await letterService.getGeneratedLetters(req.user.tenantId, filters);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/v1/templates/history/:id
// @desc    Obtener carta generada por ID
// @access  Private
router.get('/history/:id', async (req, res, next) => {
  try {
    const result = await letterService.getGeneratedLetterById(req.user.tenantId, req.params.id);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /api/v1/templates/history/:id/status
// @desc    Actualizar estado de carta
// @access  Private (Admin, Manager)
router.patch('/history/:id/status', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await letterService.updateLetterStatus(req.user.tenantId, req.params.id, status);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    next(error);
  }
});

export default router;
