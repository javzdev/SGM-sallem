import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import { generateToken, generateRefreshToken } from '../middleware/auth.js';
import { logAction } from '../middleware/audit.js';

// @desc    Registrar nuevo tenant (Super Admin)
// @route   POST /api/v1/auth/register-tenant
// @access  Public
export const registerTenant = async (req, res, next) => {
  try {
    const { name, slug, email, phone, adminUser } = req.body;

    // Verificar si el tenant ya existe
    const existingTenant = await Tenant.findOne({ $or: [{ slug }, { email }] });
    if (existingTenant) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una iglesia con este slug o email',
      });
    }

    // Crear tenant
    const tenant = await Tenant.create({
      name,
      slug,
      email,
      phone,
      subscription: {
        plan: 'free',
        status: 'active',
        maxMembers: 500,
        maxUsers: 5,
      },
    });

    // Crear usuario administrador para el tenant
    const user = await User.create({
      tenantId: tenant._id,
      email: adminUser.email,
      password: adminUser.password,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      role: 'admin',
      isVerified: true,
    });

    // Generar token
    const token = generateToken(user._id);

    await logAction(req, 'create', 'tenant', tenant._id, {}, 'Tenant registrado exitosamente');

    res.status(201).json({
      success: true,
      message: 'Iglesia registrada exitosamente',
      data: {
        tenant: {
          id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
        },
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login de usuario
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validaciones básicas
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporcione email y contraseña',
      });
    }

    // Buscar usuario incluyendo password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
      });
    }

    // Verificar si la cuenta está bloqueada
    if (user.isLocked()) {
      return res.status(403).json({
        success: false,
        message: `Cuenta bloqueada. Intente nuevamente después de ${new Date(user.lockUntil).toLocaleTimeString()}`,
      });
    }

    // Verificar contraseña
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      await user.incFailedAttempts();
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
      });
    }

    // Verificar si el usuario está activo
    if (!user.isActive || user.deletedAt) {
      return res.status(401).json({
        success: false,
        message: 'Su cuenta ha sido desactivada',
      });
    }

    // Resetear intentos fallidos
    await user.resetFailedAttempts();

    // Actualizar último login
    user.lastLogin = Date.now();
    await user.save();

    // Cargar tenant
    const tenant = await Tenant.findById(user.tenantId);

    if (!tenant || !tenant.isActive || tenant.deletedAt) {
      return res.status(403).json({
        success: false,
        message: 'Su iglesia ha sido desactivada',
      });
    }

    if (tenant.isBlocked()) {
      return res.status(403).json({
        success: false,
        message: 'Su iglesia está bloqueada por falta de pago',
      });
    }

    // Generar tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    await logAction(req, 'login', 'user', user._id, {}, 'Usuario inició sesión');

    res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatar: user.avatar,
        },
        tenant: {
          id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
          logo: tenant.settings?.logo,
          colors: tenant.settings?.colors,
        },
        token,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRE || '24h',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener usuario actual
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const tenant = await Tenant.findById(req.user.tenantId);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          phone: user.phone,
          avatar: user.avatar,
          lastLogin: user.lastLogin,
        },
        tenant: {
          id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
          logo: tenant.settings?.logo,
          colors: tenant.settings?.colors,
          subscription: tenant.subscription,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar perfil
// @route   PUT /api/v1/auth/update-profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { firstName, lastName, phone },
      { new: true, runValidators: true }
    );

    await logAction(req, 'update', 'user', user._id, {
      after: { firstName, lastName, phone },
    }, 'Perfil actualizado');

    res.status(200).json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cambiar contraseña
// @route   PUT /api/v1/auth/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporcione la contraseña actual y la nueva',
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    // Verificar contraseña actual
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta',
      });
    }

    // Actualizar contraseña
    user.password = newPassword;
    await user.save();

    await logAction(req, 'update', 'user', user._id, {}, 'Contraseña cambiada');

    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh token
// @route   POST /api/v1/auth/refresh-token
// @access  Private
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token requerido',
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const newToken = generateToken(decoded.id);

    res.status(200).json({
      success: true,
      data: {
        token: newToken,
        expiresIn: process.env.JWT_EXPIRE || '24h',
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Refresh token inválido o expirado',
    });
  }
};

// @desc    Logout
// @route   POST /api/v1/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    await logAction(req, 'logout', 'user', req.user._id, {}, 'Usuario cerró sesión');

    res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente',
    });
  } catch (error) {
    next(error);
  }
};
