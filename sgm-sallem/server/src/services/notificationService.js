import cron from 'node-cron';
import Member from '../models/Member.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { logAction } from '../middleware/audit.js';

/**
 * Servicio de notificaciones automáticas
 * Programa y envía notificaciones basadas en eventos
 */

// Almacenar jobs activos
const activeJobs = new Map();

/**
 * Inicializar todos los jobs programados
 */
export const initializeScheduledJobs = () => {
  console.log('📅 Inicializando trabajos programados...');

  // Job diario a las 8:00 AM para verificar cumpleaños
  const birthdayJob = cron.schedule('0 8 * * *', async () => {
    console.log('🎂 Ejecutando job de cumpleaños...');
    await checkBirthdays();
  });

  // Job diario a las 8:30 AM para verificar aniversarios de bautismo/membresía
  const anniversaryJob = cron.schedule('30 8 * * *', async () => {
    console.log('💍 Ejecutando job de aniversarios...');
    await checkAnniversaries();
  });

  // Job semanal los lunes a las 9:00 AM para resumen de nuevos miembros
  const newMembersJob = cron.schedule('0 9 * * 1', async () => {
    console.log('📊 Ejecutando job de nuevos miembros...');
    await checkNewMembers();
  });

  // Job diario a las 7:00 PM para limpiar notificaciones antiguas (más de 30 días)
  const cleanupJob = cron.schedule('0 19 * * *', async () => {
    console.log('🧹 Ejecutando job de limpieza...');
    await cleanupOldNotifications();
  });

  // Guardar referencias
  activeJobs.set('birthday', birthdayJob);
  activeJobs.set('anniversary', anniversaryJob);
  activeJobs.set('newMembers', newMembersJob);
  activeJobs.set('cleanup', cleanupJob);

  console.log('✅ Trabajos programados inicializados correctamente');
};

/**
 * Detener todos los jobs
 */
export const stopAllJobs = () => {
  activeJobs.forEach((job, name) => {
    job.stop();
    console.log(`⏹️ Job ${name} detenido`);
  });
  activeJobs.clear();
};

/**
 * Verificar cumpleaños del día
 */
const checkBirthdays = async () => {
  try {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();

    // Obtener todos los miembros activos cuya fecha de nacimiento coincida con hoy
    const members = await Member.find({
      isActive: true,
      deletedAt: null,
      dateOfBirth: { $exists: true },
    }).populate('tenantId', 'name settings');

    const birthdaysToday = members.filter(member => {
      const birthDate = new Date(member.dateOfBirth);
      return birthDate.getDate() === currentDay && 
             birthDate.getMonth() === currentMonth;
    });

    if (birthdaysToday.length === 0) {
      console.log('No hay cumpleaños hoy');
      return;
    }

    // Crear notificaciones por tenant
    const tenantsMap = new Map();
    birthdaysToday.forEach(member => {
      if (!tenantsMap.has(member.tenantId._id.toString())) {
        tenantsMap.set(member.tenantId._id.toString(), []);
      }
      tenantsMap.get(member.tenantId._id.toString()).push(member);
    });

    for (const [tenantId, members] of tenantsMap.entries()) {
      // Obtener administradores del tenant
      const admins = await User.find({
        tenantId,
        role: { $in: ['admin', 'superadmin', 'manager'] },
        isActive: true,
      });

      for (const member of members) {
        const age = calculateAge(member.dateOfBirth);
        
        const notification = await Notification.create({
          tenantId,
          type: 'birthday',
          title: `¡Cumpleaños de ${member.firstName} ${member.lastName}!`,
          message: `${member.firstName} ${member.lastName} cumple ${age} años hoy. ¡Felicidades!`,
          data: {
            memberId: member._id,
            memberName: `${member.firstName} ${member.lastName}`,
            age,
          },
          priority: 'medium',
          isRead: false,
        });

        // Log de auditoría
        const fakeReq = {
          user: { _id: 'system', tenantId },
          body: { type: 'birthday', memberId: member._id },
        };
        await logAction(fakeReq, 'create', 'notification', notification._id, {}, 'Notificación de cumpleaños creada automáticamente');
      }

      console.log(`✅ ${members.length} notificaciones de cumpleaños creadas para tenant ${tenantId}`);
    }

  } catch (error) {
    console.error('❌ Error al verificar cumpleaños:', error.message);
  }
};

/**
 * Verificar aniversarios de bautismo o membresía
 */
const checkAnniversaries = async () => {
  try {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();

    // Miembros con fecha de bautismo hoy
    const baptismMembers = await Member.find({
      isActive: true,
      deletedAt: null,
      baptismDate: { $exists: true },
    }).populate('tenantId', 'name');

    const baptismToday = baptismMembers.filter(member => {
      const bapDate = new Date(member.baptismDate);
      return bapDate.getDate() === currentDay && 
             bapDate.getMonth() === currentMonth;
    });

    // Miembros con fecha de membresía hoy
    const membershipMembers = await Member.find({
      isActive: true,
      deletedAt: null,
      membershipDate: { $exists: true },
    }).populate('tenantId', 'name');

    const membershipToday = membershipMembers.filter(member => {
      const memDate = new Date(member.membershipDate);
      return memDate.getDate() === currentDay && 
             memDate.getMonth() === currentMonth;
    });

    const tenantsMap = new Map();

    // Procesar bautismos
    for (const member of baptismToday) {
      if (!tenantsMap.has(member.tenantId._id.toString())) {
        tenantsMap.set(member.tenantId._id.toString(), []);
      }
      
      const years = today.getFullYear() - new Date(member.baptismDate).getFullYear();
      
      tenantsMap.get(member.tenantId._id.toString()).push({
        type: 'baptism',
        member,
        years,
      });
    }

    // Procesar membresías
    for (const member of membershipToday) {
      if (!tenantsMap.has(member.tenantId._id.toString())) {
        tenantsMap.set(member.tenantId._id.toString(), []);
      }
      
      const years = today.getFullYear() - new Date(member.membershipDate).getFullYear();
      
      tenantsMap.get(member.tenantId._id.toString()).push({
        type: 'membership',
        member,
        years,
      });
    }

    for (const [tenantId, anniversaries] of tenantsMap.entries()) {
      for (const { type, member, years } of anniversaries) {
        const title = type === 'baptism' 
          ? `Aniversario de bautismo de ${member.firstName}`
          : `Aniversario de membresía de ${member.firstName}`;
        
        const message = type === 'baptism'
          ? `${member.firstName} ${member.lastName} cumple ${years} año(s) de su bautismo hoy.`
          : `${member.firstName} ${member.lastName} cumple ${years} año(s) como miembro hoy.`;

        const notification = await Notification.create({
          tenantId,
          type: 'anniversary',
          title,
          message,
          data: {
            memberId: member._id,
            memberName: `${member.firstName} ${member.lastName}`,
            anniversaryType: type,
            years,
          },
          priority: 'low',
          isRead: false,
        });

        const fakeReq = {
          user: { _id: 'system', tenantId },
          body: { type: 'anniversary', memberId: member._id },
        };
        await logAction(fakeReq, 'create', 'notification', notification._id, {}, 'Notificación de aniversario creada automáticamente');
      }

      console.log(`✅ ${anniversaries.length} notificaciones de aniversario creadas para tenant ${tenantId}`);
    }

  } catch (error) {
    console.error('❌ Error al verificar aniversarios:', error.message);
  }
};

/**
 * Verificar nuevos miembros de la semana
 */
const checkNewMembers = async () => {
  try {
    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const members = await Member.find({
      isActive: true,
      deletedAt: null,
      createdAt: { $gte: oneWeekAgo },
    }).populate('tenantId', 'name');

    if (members.length === 0) {
      console.log('No hay nuevos miembros esta semana');
      return;
    }

    const tenantsMap = new Map();
    members.forEach(member => {
      if (!tenantsMap.has(member.tenantId._id.toString())) {
        tenantsMap.set(member.tenantId._id.toString(), []);
      }
      tenantsMap.get(member.tenantId._id.toString()).push(member);
    });

    for (const [tenantId, newMembers] of tenantsMap.entries()) {
      const admins = await User.find({
        tenantId,
        role: { $in: ['admin', 'superadmin'] },
        isActive: true,
      });

      const notification = await Notification.create({
        tenantId,
        type: 'new_members',
        title: `Nuevos miembros esta semana`,
        message: `Se registraron ${newMembers.length} nuevo(s) miembro(s) esta semana.`,
        data: {
          count: newMembers.length,
          memberIds: newMembers.map(m => m._id),
          period: 'weekly',
        },
        priority: 'medium',
        isRead: false,
      });

      const fakeReq = {
        user: { _id: 'system', tenantId },
        body: { type: 'new_members', count: newMembers.length },
      };
      await logAction(fakeReq, 'create', 'notification', notification._id, {}, 'Resumen semanal de nuevos miembros creado');

      console.log(`✅ Notificación de ${newMembers.length} nuevos miembros creada para tenant ${tenantId}`);
    }

  } catch (error) {
    console.error('❌ Error al verificar nuevos miembros:', error.message);
  }
};

/**
 * Limpiar notificaciones antiguas (más de 30 días)
 */
const cleanupOldNotifications = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await Notification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo },
      isRead: true,
    });

    console.log(`🧹 ${result.deletedCount} notificaciones antiguas eliminadas`);

  } catch (error) {
    console.error('❌ Error al limpiar notificaciones:', error.message);
  }
};

/**
 * Crear notificación manual
 */
export const createManualNotification = async (tenantId, userId, notificationData) => {
  try {
    const notification = await Notification.create({
      tenantId,
      ...notificationData,
      createdBy: userId,
    });

    return {
      success: true,
      data: notification,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// Funciones auxiliares
const calculateAge = (birthDate) => {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export default {
  initializeScheduledJobs,
  stopAllJobs,
  createManualNotification,
};
