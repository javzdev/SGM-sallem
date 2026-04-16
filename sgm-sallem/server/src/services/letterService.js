import LetterTemplate from '../models/LetterTemplate.js';
import GeneratedLetter from '../models/GeneratedLetter.js';
import Member from '../models/Member.js';
import { generateLetterPDF, generateBulkLettersPDF } from './pdfService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Servicio para gestión de plantillas y generación de cartas
 */

/**
 * Crear plantilla de carta
 */
export const createTemplate = async (tenantId, templateData) => {
  try {
    // Verificar si ya existe una plantilla con el mismo nombre
    const existing = await LetterTemplate.findOne({
      tenantId,
      name: templateData.name,
      deletedAt: null,
    });

    if (existing) {
      return {
        success: false,
        message: 'Ya existe una plantilla con este nombre',
      };
    }

    const template = await LetterTemplate.create({
      tenantId,
      ...templateData,
      isSystem: false,
    });

    return {
      success: true,
      data: template,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Obtener plantillas por tenant
 */
export const getTemplates = async (tenantId, filters = {}) => {
  try {
    const query = {
      tenantId,
      deletedAt: null,
    };

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.isSystem !== undefined) {
      query.isSystem = filters.isSystem;
    }

    const templates = await LetterTemplate.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      count: templates.length,
      data: templates,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Obtener plantilla por ID
 */
export const getTemplateById = async (tenantId, templateId) => {
  try {
    const template = await LetterTemplate.findOne({
      _id: templateId,
      tenantId,
      deletedAt: null,
    });

    if (!template) {
      return {
        success: false,
        message: 'Plantilla no encontrada',
      };
    }

    return {
      success: true,
      data: template,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Actualizar plantilla
 */
export const updateTemplate = async (tenantId, templateId, updateData) => {
  try {
    const template = await LetterTemplate.findOne({
      _id: templateId,
      tenantId,
      deletedAt: null,
    });

    if (!template) {
      return {
        success: false,
        message: 'Plantilla no encontrada',
      };
    }

    // No permitir editar plantillas del sistema
    if (template.isSystem) {
      return {
        success: false,
        message: 'Las plantillas del sistema no se pueden editar. Duplíquela primero.',
      };
    }

    const updated = await LetterTemplate.findByIdAndUpdate(
      templateId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Duplicar plantilla del sistema
 */
export const duplicateTemplate = async (tenantId, templateId) => {
  try {
    const original = await LetterTemplate.findOne({
      _id: templateId,
      tenantId,
      deletedAt: null,
    });

    if (!original) {
      return {
        success: false,
        message: 'Plantilla no encontrada',
      };
    }

    const duplicated = await LetterTemplate.create({
      tenantId,
      name: `${original.name} (Copia)`,
      description: original.description,
      category: original.category,
      content: original.content,
      variables: original.variables,
      isSystem: false,
      isActive: true,
    });

    return {
      success: true,
      message: 'Plantilla duplicada exitosamente',
      data: duplicated,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Eliminar plantilla (soft delete)
 */
export const deleteTemplate = async (tenantId, templateId) => {
  try {
    const template = await LetterTemplate.findOne({
      _id: templateId,
      tenantId,
      deletedAt: null,
    });

    if (!template) {
      return {
        success: false,
        message: 'Plantilla no encontrada',
      };
    }

    if (template.isSystem) {
      return {
        success: false,
        message: 'Las plantillas del sistema no se pueden eliminar',
      };
    }

    await template.softDelete();

    return {
      success: true,
      message: 'Plantilla eliminada exitosamente',
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Generar carta individual
 */
export const generateLetter = async (tenantId, userId, letterData) => {
  try {
    const { templateId, memberId, title, customVariables } = letterData;

    // Obtener plantilla
    const templateResult = await getTemplateById(tenantId, templateId);
    if (!templateResult.success) {
      return templateResult;
    }
    const template = templateResult.data;

    // Obtener miembro
    const member = await Member.findOne({
      _id: memberId,
      tenantId,
      deletedAt: null,
    });

    if (!member) {
      return {
        success: false,
        message: 'Miembro no encontrado',
      };
    }

    // Crear snapshot del contenido con variables reemplazadas
    let content = template.content;
    
    // Variables dinámicas
    const variables = {
      '{{nombre_completo}}': `${member.firstName} ${member.lastName}${member.secondLastName ? ' ' + member.secondLastName : ''}`,
      '{{nombre}}': member.firstName,
      '{{apellido}}': member.lastName,
      '{{identificacion}}': member.identificationNumber || '',
      '{{fecha_nacimiento}}': member.dateOfBirth ? formatDate(member.dateOfBirth) : '',
      '{{edad}}': calculateAge(member.dateOfBirth) || '',
      '{{fecha_actual}}': formatDate(new Date()),
      ...customVariables,
    };

    Object.entries(variables).forEach(([placeholder, value]) => {
      content = content.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    // Crear registro de carta generada
    const generatedLetter = await GeneratedLetter.create({
      tenantId,
      template: templateId,
      member: memberId,
      title: title || template.name,
      content, // Snapshot del contenido
      variables,
      status: 'generated',
      generatedBy: userId,
    });

    // Generar PDF
    const uploadsDir = path.join(__dirname, '../../public/uploads/letters');
    const filename = `letter_${generatedLetter._id}_${Date.now()}.pdf`;
    const outputPath = path.join(uploadsDir, filename);

    // Asegurar que el directorio existe
    const fs = await import('fs');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const pdfResult = await generateLetterPDF(
      {
        content: template.content,
        title: title || template.name,
        logo: null, // Se puede agregar logo del tenant
        showSignature: true,
        signatureText: 'Firma Autorizada',
      },
      member,
      outputPath
    );

    if (pdfResult.success) {
      generatedLetter.pdfUrl = `/uploads/letters/${filename}`;
      generatedLetter.status = 'generated';
      await generatedLetter.save();
    }

    return {
      success: true,
      message: 'Carta generada exitosamente',
      data: generatedLetter,
      pdfUrl: generatedLetter.pdfUrl,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Generar cartas masivas
 */
export const generateBulkLetters = async (tenantId, userId, bulkData) => {
  try {
    const { templateId, memberIds, title } = bulkData;

    // Obtener plantilla
    const templateResult = await getTemplateById(tenantId, templateId);
    if (!templateResult.success) {
      return templateResult;
    }
    const template = templateResult.data;

    // Obtener miembros
    const members = await Member.find({
      _id: { $in: memberIds },
      tenantId,
      deletedAt: null,
    });

    if (members.length === 0) {
      return {
        success: false,
        message: 'No se encontraron miembros válidos',
      };
    }

    const letters = [];
    const pdfFiles = [];

    // Generar cada carta
    for (const member of members) {
      let content = template.content;
      
      const variables = {
        '{{nombre_completo}}': `${member.firstName} ${member.lastName}${member.secondLastName ? ' ' + member.secondLastName : ''}`,
        '{{nombre}}': member.firstName,
        '{{apellido}}': member.lastName,
        '{{identificacion}}': member.identificationNumber || '',
        '{{fecha_actual}}': formatDate(new Date()),
      };

      Object.entries(variables).forEach(([placeholder, value]) => {
        content = content.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
      });

      const generatedLetter = await GeneratedLetter.create({
        tenantId,
        template: templateId,
        member: member._id,
        title: title || template.name,
        content,
        variables,
        status: 'generated',
        generatedBy: userId,
      });

      letters.push({
        templateData: {
          content: template.content,
          title: title || template.name,
          showSignature: true,
        },
        memberData: member.toObject(),
        letter: generatedLetter,
      });
    }

    // Generar PDF combinado
    const uploadsDir = path.join(__dirname, '../../public/uploads/letters');
    const fs = await import('fs');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `bulk_letters_${Date.now()}.pdf`;
    const outputPath = path.join(uploadsDir, filename);

    const pdfResult = await generateBulkLettersPDF(letters, outputPath);

    if (pdfResult.success) {
      // Actualizar todas las cartas con la URL del PDF
      for (const { letter } of letters) {
        letter.pdfUrl = `/uploads/letters/${filename}`;
        await letter.save();
      }
    }

    return {
      success: true,
      message: `${letters.length} cartas generadas exitosamente`,
      count: letters.length,
      pdfUrl: pdfResult.success ? pdfResult.path : null,
      letters: letters.map(l => l.data),
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Obtener historial de cartas generadas
 */
export const getGeneratedLetters = async (tenantId, filters = {}) => {
  try {
    const query = {
      tenantId,
      deletedAt: null,
    };

    if (filters.memberId) {
      query.member = filters.memberId;
    }

    if (filters.templateId) {
      query.template = filters.templateId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const letters = await GeneratedLetter.find(query)
      .populate('member', 'firstName lastName identificationNumber')
      .populate('template', 'name category')
      .populate('generatedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      count: letters.length,
      data: letters,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Obtener carta generada por ID
 */
export const getGeneratedLetterById = async (tenantId, letterId) => {
  try {
    const letter = await GeneratedLetter.findOne({
      _id: letterId,
      tenantId,
      deletedAt: null,
    })
      .populate('member', 'firstName lastName identificationNumber email phone')
      .populate('template', 'name category content')
      .populate('generatedBy', 'firstName lastName email');

    if (!letter) {
      return {
        success: false,
        message: 'Carta no encontrada',
      };
    }

    return {
      success: true,
      data: letter,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Actualizar estado de carta
 */
export const updateLetterStatus = async (tenantId, letterId, status) => {
  try {
    const letter = await GeneratedLetter.findOne({
      _id: letterId,
      tenantId,
      deletedAt: null,
    });

    if (!letter) {
      return {
        success: false,
        message: 'Carta no encontrada',
      };
    }

    letter.status = status;
    if (status === 'sent') {
      letter.sentAt = Date.now();
    }
    await letter.save();

    return {
      success: true,
      data: letter,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// Funciones auxiliares
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return d.toLocaleDateString('es-ES', options);
};

const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age.toString();
};

export default {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  duplicateTemplate,
  deleteTemplate,
  generateLetter,
  generateBulkLetters,
  getGeneratedLetters,
  getGeneratedLetterById,
  updateLetterStatus,
};
