import Member from '../models/Member.js';
import { logAction } from '../middleware/audit.js';

// @desc    Obtener todos los miembros con filtros y paginación
// @route   GET /api/v1/members
// @access  Private
export const getMembers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      ministry,
      status,
      gender,
      orderBy = 'createdAt',
      order = 'desc',
    } = req.query;

    // Construir query base
    const query = {
      tenantId: req.user.tenantId,
      deletedAt: null,
    };

    // Filtros
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { identificationNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (ministry) {
      query['ministries.ministry'] = ministry;
    }

    if (status) {
      query.membershipStatus = status;
    }

    if (gender) {
      query.gender = gender;
    }

    // Ordenamiento
    const sortOptions = { [orderBy]: order === 'asc' ? 1 : -1 };

    // Ejecutar consulta con paginación
    const members = await Member.find(query)
      .populate('ministries.ministry', 'name')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Contar total
    const total = await Member.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        members,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener miembro por ID
// @route   GET /api/v1/members/:id
// @access  Private
export const getMember = async (req, res, next) => {
  try {
    const member = await Member.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      deletedAt: null,
    }).populate('ministries.ministry', 'name');

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Miembro no encontrado',
      });
    }

    res.status(200).json({
      success: true,
      data: { member },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear nuevo miembro
// @route   POST /api/v1/members
// @access  Private (Admin, Manager)
export const createMember = async (req, res, next) => {
  try {
    // Agregar tenantId automáticamente
    const memberData = {
      ...req.body,
      tenantId: req.user.tenantId,
    };

    const member = await Member.create(memberData);

    await logAction(req, 'create', 'member', member._id, {
      after: memberData,
    }, 'Miembro creado exitosamente');

    res.status(201).json({
      success: true,
      message: 'Miembro creado exitosamente',
      data: { member },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar miembro
// @route   PUT /api/v1/members/:id
// @access  Private (Admin, Manager)
export const updateMember = async (req, res, next) => {
  try {
    const member = await Member.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      deletedAt: null,
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Miembro no encontrado',
      });
    }

    // Guardar cambios previos para auditoría
    const before = member.toObject();

    // Actualizar miembro
    const updatedMember = await Member.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('ministries.ministry', 'name');

    await logAction(req, 'update', 'member', updatedMember._id, {
      before,
      after: req.body,
    }, 'Miembro actualizado');

    res.status(200).json({
      success: true,
      message: 'Miembro actualizado exitosamente',
      data: { member: updatedMember },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar miembro (soft delete)
// @route   DELETE /api/v1/members/:id
// @access  Private (Admin)
export const deleteMember = async (req, res, next) => {
  try {
    const member = await Member.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      deletedAt: null,
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Miembro no encontrado',
      });
    }

    await member.softDelete();

    await logAction(req, 'delete', 'member', member._id, {}, 'Miembro eliminado (soft delete)');

    res.status(200).json({
      success: true,
      message: 'Miembro eliminado exitosamente',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Restaurar miembro eliminado
// @route   PATCH /api/v1/members/:id/restore
// @access  Private (Admin)
export const restoreMember = async (req, res, next) => {
  try {
    const member = await Member.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Miembro no encontrado',
      });
    }

    await member.restore();

    await logAction(req, 'restore', 'member', member._id, {}, 'Miembro restaurado');

    res.status(200).json({
      success: true,
      message: 'Miembro restaurado exitosamente',
      data: { member },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Importar miembros masivamente
// @route   POST /api/v1/members/import
// @access  Private (Admin)
export const importMembers = async (req, res, next) => {
  try {
    const { members } = req.body;

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un array de miembros',
      });
    }

    // Verificar límite de miembros
    const currentCount = await Member.countDocuments({
      tenantId: req.user.tenantId,
      deletedAt: null,
    });

    if (currentCount + members.length > req.tenant.subscription.maxMembers) {
      return res.status(400).json({
        success: false,
        message: `Excede el límite de ${req.tenant.subscription.maxMembers} miembros. Actualice su plan.`,
      });
    }

    // Preparar miembros para inserción
    const membersToCreate = members.map(member => ({
      ...member,
      tenantId: req.user.tenantId,
    }));

    // Insertar en lote
    const createdMembers = await Member.insertMany(membersToCreate, {
      ordered: false, // Continuar incluso si algunos fallan
    });

    await logAction(req, 'import', 'member', null, {
      count: createdMembers.length,
    }, `Importación masiva de ${createdMembers.length} miembros`);

    res.status(201).json({
      success: true,
      message: `${createdMembers.length} miembros importados exitosamente`,
      data: {
        count: createdMembers.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Exportar miembros
// @route   GET /api/v1/members/export
// @access  Private
export const exportMembers = async (req, res, next) => {
  try {
    const members = await Member.find({
      tenantId: req.user.tenantId,
      deletedAt: null,
    }).select('-__v');

    await logAction(req, 'export', 'member', null, {
      count: members.length,
    }, 'Exportación de miembros');

    res.status(200).json({
      success: true,
      data: { members },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener estadísticas de miembros
// @route   GET /api/v1/members/stats
// @access  Private
export const getMemberStats = async (req, res, next) => {
  try {
    const stats = await Member.aggregate([
      {
        $match: {
          tenantId: req.user.tenantId,
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: '$membershipStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    const byGender = await Member.aggregate([
      {
        $match: {
          tenantId: req.user.tenantId,
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalMembers = await Member.countDocuments({
      tenantId: req.user.tenantId,
      deletedAt: null,
    });

    const birthdaysThisMonth = await Member.countDocuments({
      tenantId: req.user.tenantId,
      deletedAt: null,
      dateOfBirth: {
        $gte: new Date(new Date().setDate(1)),
        $lt: new Date(new Date().setMonth(new Date().getMonth() + 1, 0)),
      },
    });

    res.status(200).json({
      success: true,
      data: {
        totalMembers,
        byStatus: stats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        byGender: byGender.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        birthdaysThisMonth,
      },
    });
  } catch (error) {
    next(error);
  }
};
