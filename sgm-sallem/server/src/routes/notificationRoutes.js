import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Notification from '../models/Notification.js';
import * as notificationService from '../services/notificationService.js';

const router = express.Router();

// Todas las rutas están protegidas y requieren autenticación
router.use(protect);

// @route   GET /api/v1/notifications
// @desc    Obtener todas las notificaciones del tenant
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, isRead, priority } = req.query;

    const query = {
      tenantId: req.user.tenantId,
    };

    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (priority) query.priority = priority;

    const notifications = await Notification.find(query)
      .populate('recipient', 'firstName lastName email')
      .populate('relatedMember', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Notification.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/v1/notifications/unread-count
// @desc    Obtener cantidad de notificaciones no leídas
// @access  Private
router.get('/unread-count', async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      tenantId: req.user.tenantId,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/v1/notifications/:id/read
// @desc    Marcar notificación como leída
// @access  Private
router.put('/:id/read', async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada',
      });
    }

    await notification.markAsRead(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Notificación marcada como leída',
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/v1/notifications/read-all
// @desc    Marcar todas las notificaciones como leídas
// @access  Private
router.put('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        tenantId: req.user.tenantId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: Date.now(),
          readBy: req.user._id,
        },
      }
    );

    res.status(200).json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas',
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/v1/notifications/:id
// @desc    Eliminar notificación
// @access  Private (Admin, Manager)
router.delete('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notificación eliminada',
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/v1/notifications
// @desc    Crear notificación manual
// @access  Private (Admin, Manager)
router.post('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { type, title, message, recipientId, recipientIds, priority, relatedMemberId, relatedMinistryId } = req.body;

    const notificationData = {
      type,
      title,
      message,
      priority: priority || 'medium',
    };

    if (recipientId) {
      notificationData.recipient = recipientId;
    } else if (recipientIds && recipientIds.length > 0) {
      notificationData.recipients = recipientIds;
    }

    if (relatedMemberId) {
      notificationData.relatedMember = relatedMemberId;
    }

    if (relatedMinistryId) {
      notificationData.relatedMinistry = relatedMinistryId;
    }

    const result = await notificationService.createManualNotification(
      req.user.tenantId,
      req.user._id,
      notificationData
    );

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    next(error);
  }
});

export default router;
