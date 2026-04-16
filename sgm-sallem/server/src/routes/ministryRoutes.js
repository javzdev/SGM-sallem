import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Ministry from '../models/Ministry.js';
import Member from '../models/Member.js';
import { logAction } from '../middleware/audit.js';

const router = express.Router();

// Todas las rutas están protegidas
router.use(protect);

// @route   GET /api/v1/ministries
// @desc    Obtener todos los ministerios
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    const { category, isActive } = req.query;

    const query = {
      tenantId: req.user.tenantId,
      deletedAt: null,
    };

    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const ministries = await Ministry.find(query)
      .populate('leader', 'firstName lastName')
      .populate('coLeader', 'firstName lastName')
      .sort({ name: 1 });

    // Contar miembros por ministerio
    const ministriesWithCount = await Promise.all(
      ministries.map(async (ministry) => {
        const memberCount = await Member.countDocuments({
          tenantId: req.user.tenantId,
          deletedAt: null,
          'ministries.ministry': ministry._id,
          'ministries.isActive': true,
        });

        return {
          ...ministry.toObject(),
          memberCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: ministriesWithCount.length,
      data: { ministries: ministriesWithCount },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/v1/ministries/:id
// @desc    Obtener ministerio por ID
// @access  Private
router.get('/:id', async (req, res, next) => {
  try {
    const ministry = await Ministry.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      deletedAt: null,
    })
      .populate('leader', 'firstName lastName email phone')
      .populate('coLeader', 'firstName lastName email phone');

    if (!ministry) {
      return res.status(404).json({
        success: false,
        message: 'Ministerio no encontrado',
      });
    }

    // Obtener miembros del ministerio
    const members = await Member.find({
      tenantId: req.user.tenantId,
      deletedAt: null,
      'ministries.ministry': ministry._id,
      'ministries.isActive': true,
    }).select('firstName lastName identificationNumber photo');

    res.status(200).json({
      success: true,
      data: {
        ministry,
        members,
        memberCount: members.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/v1/ministries
// @desc    Crear nuevo ministerio
// @access  Private (Admin, Manager)
router.post('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const ministryData = {
      ...req.body,
      tenantId: req.user.tenantId,
    };

    const ministry = await Ministry.create(ministryData);

    await logAction(req, 'create', 'ministry', ministry._id, {
      after: ministryData,
    }, 'Ministerio creado exitosamente');

    res.status(201).json({
      success: true,
      message: 'Ministerio creado exitosamente',
      data: { ministry },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/v1/ministries/:id
// @desc    Actualizar ministerio
// @access  Private (Admin, Manager)
router.put('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const ministry = await Ministry.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      deletedAt: null,
    });

    if (!ministry) {
      return res.status(404).json({
        success: false,
        message: 'Ministerio no encontrado',
      });
    }

    const updatedMinistry = await Ministry.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    await logAction(req, 'update', 'ministry', updatedMinistry._id, {
      after: req.body,
    }, 'Ministerio actualizado');

    res.status(200).json({
      success: true,
      message: 'Ministerio actualizado exitosamente',
      data: { ministry: updatedMinistry },
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/v1/ministries/:id
// @desc    Eliminar ministerio (soft delete)
// @access  Private (Admin)
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const ministry = await Ministry.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      deletedAt: null,
    });

    if (!ministry) {
      return res.status(404).json({
        success: false,
        message: 'Ministerio no encontrado',
      });
    }

    await ministry.softDelete();

    await logAction(req, 'delete', 'ministry', ministry._id, {}, 'Ministerio eliminado');

    res.status(200).json({
      success: true,
      message: 'Ministerio eliminado exitosamente',
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/v1/ministries/:id/assign-member
// @desc    Asignar miembro a ministerio
// @access  Private (Admin, Manager)
router.post('/:id/assign-member', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { memberId, role = 'member' } = req.body;

    const ministry = await Ministry.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      deletedAt: null,
    });

    if (!ministry) {
      return res.status(404).json({
        success: false,
        message: 'Ministerio no encontrado',
      });
    }

    const member = await Member.findOne({
      _id: memberId,
      tenantId: req.user.tenantId,
      deletedAt: null,
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Miembro no encontrado',
      });
    }

    // Verificar si ya está asignado
    const existingAssignment = member.ministries.find(
      m => m.ministry.toString() === req.params.id && m.isActive
    );

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: 'El miembro ya está asignado a este ministerio',
      });
    }

    // Agregar ministerio al miembro
    member.ministries.push({
      ministry: ministry._id,
      role,
      startDate: Date.now(),
      isActive: true,
    });

    await member.save();

    await logAction(req, 'assign', 'ministry_member', member._id, {
      ministryId: ministry._id,
      role,
    }, `Miembro asignado al ministerio ${ministry.name}`);

    res.status(200).json({
      success: true,
      message: 'Miembro asignado exitosamente',
      data: { member },
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/v1/ministries/:id/remove-member/:memberId
// @desc    Remover miembro de ministerio
// @access  Private (Admin, Manager)
router.delete('/:id/remove-member/:memberId', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const ministry = await Ministry.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      deletedAt: null,
    });

    if (!ministry) {
      return res.status(404).json({
        success: false,
        message: 'Ministerio no encontrado',
      });
    }

    const member = await Member.findOne({
      _id: req.params.memberId,
      tenantId: req.user.tenantId,
      deletedAt: null,
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Miembro no encontrado',
      });
    }

    // Desactivar asignación en lugar de eliminar
    const assignment = member.ministries.find(
      m => m.ministry.toString() === req.params.id && m.isActive
    );

    if (!assignment) {
      return res.status(400).json({
        success: false,
        message: 'El miembro no está asignado a este ministerio',
      });
    }

    assignment.isActive = false;
    assignment.endDate = Date.now();
    await member.save();

    await logAction(req, 'remove', 'ministry_member', member._id, {
      ministryId: ministry._id,
    }, `Miembro removido del ministerio ${ministry.name}`);

    res.status(200).json({
      success: true,
      message: 'Miembro removido exitosamente',
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/v1/ministries/stats/overview
// @desc    Obtener estadísticas generales de ministerios
// @access  Private
router.get('/stats/overview', async (req, res, next) => {
  try {
    const stats = await Ministry.aggregate([
      {
        $match: {
          tenantId: req.user.tenantId,
          deletedAt: null,
          isActive: true,
        },
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalMinistries = await Ministry.countDocuments({
      tenantId: req.user.tenantId,
      deletedAt: null,
      isActive: true,
    });

    res.status(200).json({
      success: true,
      data: {
        totalMinistries,
        byCategory: stats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
