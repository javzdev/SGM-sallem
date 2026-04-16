import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Servicio para generación de PDFs
 * Usa pdfkit para crear documentos PDF con plantillas
 */

export const generateLetterPDF = async (templateData, memberData, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      // Crear documento PDF tamaño A4
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        },
      });

      // Crear stream de escritura
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Reemplazar variables en el contenido de la plantilla
      let content = templateData.content;
      
      // Variables básicas del miembro
      const variables = {
        '{{nombre_completo}}': `${memberData.firstName} ${memberData.lastName}${memberData.secondLastName ? ' ' + memberData.secondLastName : ''}`,
        '{{nombre}}': memberData.firstName,
        '{{apellido}}': memberData.lastName,
        '{{identificacion}}': memberData.identificationNumber || '',
        '{{fecha_nacimiento}}': memberData.dateOfBirth ? formatDate(memberData.dateOfBirth) : '',
        '{{edad}}': calculateAge(memberData.dateOfBirth) || '',
        '{{genero}}': translateGender(memberData.gender) || '',
        '{{email}}': memberData.email || '',
        '{{telefono}}': memberData.phone || memberData.mobilePhone || '',
        '{{direccion}}': formatAddress(memberData.address) || '',
        '{{fecha_bautismo}}': memberData.baptismDate ? formatDate(memberData.baptismDate) : '',
        '{{lugar_bautismo}}': memberData.baptismPlace || '',
        '{{fecha_miembro}}': memberData.membershipDate ? formatDate(memberData.membershipDate) : '',
        '{{estado_miembro}}': translateMembershipStatus(memberData.membershipStatus) || '',
        '{{ministerios}}': formatMinistries(memberData.ministries) || 'Ninguno',
        '{{contacto_emergencia}}': memberData.emergencyContact?.name || '',
        '{{telefono_emergencia}}': memberData.emergencyContact?.phone || '',
        '{{notas}}': memberData.notes || '',
        '{{fecha_actual}}': formatDate(new Date()),
        '{{ciudad}}': memberData.address?.city || '',
        '{{pais}}': memberData.address?.country || 'Colombia',
      };

      // Reemplazar todas las variables
      Object.entries(variables).forEach(([placeholder, value]) => {
        content = content.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
      });

      // Agregar logo si existe
      if (templateData.logo) {
        try {
          doc.image(templateData.logo, 50, 50, { width: 100 });
          doc.moveDown(3);
        } catch (error) {
          console.log('No se pudo cargar el logo:', error.message);
          doc.moveDown(2);
        }
      } else {
        doc.moveDown(2);
      }

      // Agregar título si existe
      if (templateData.title) {
        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .text(templateData.title, { align: 'center' })
          .moveDown(1);
      }

      // Agregar contenido principal
      doc
        .fontSize(12)
        .font('Helvetica')
        .text(content, {
          align: 'justify',
          lineGap: 5,
        });

      // Agregar fecha y firma si existen
      if (templateData.showSignature) {
        doc.moveDown(3);
        
        // Línea de firma
        doc.moveTo(200, doc.y).lineTo(400, doc.y).stroke();
        doc.moveDown(0.5);
        
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(templateData.signatureText || 'Firma Autorizada', { align: 'center' });
        
        if (templateData.churchName) {
          doc.moveDown(0.5);
          doc
            .fontSize(10)
            .font('Helvetica')
            .text(templateData.churchName, { align: 'center' });
        }
      }

      // Finalizar documento
      doc.end();

      writeStream.on('finish', () => {
        resolve({
          success: true,
          path: outputPath,
          filename: path.basename(outputPath),
        });
      });

      writeStream.on('error', (error) => {
        reject({
          success: false,
          message: 'Error al escribir el archivo PDF',
          error: error.message,
        });
      });

    } catch (error) {
      reject({
        success: false,
        message: 'Error al generar el PDF',
        error: error.message,
      });
    }
  });
};

/**
 * Generar múltiples cartas en un solo PDF
 */
export const generateBulkLettersPDF = async (letters, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        },
        autoFirstPage: false,
      });

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      letters.forEach((letter, index) => {
        if (index > 0) {
          doc.addPage();
        }

        const { templateData, memberData } = letter;
        
        // Reutilizar lógica de generación individual
        let content = templateData.content;
        
        const variables = {
          '{{nombre_completo}}': `${memberData.firstName} ${memberData.lastName}${memberData.secondLastName ? ' ' + memberData.secondLastName : ''}`,
          '{{nombre}}': memberData.firstName,
          '{{apellido}}': memberData.lastName,
          '{{identificacion}}': memberData.identificationNumber || '',
          '{{fecha_nacimiento}}': memberData.dateOfBirth ? formatDate(memberData.dateOfBirth) : '',
          '{{edad}}': calculateAge(memberData.dateOfBirth) || '',
          '{{fecha_actual}}': formatDate(new Date()),
        };

        Object.entries(variables).forEach(([placeholder, value]) => {
          content = content.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
        });

        if (templateData.title) {
          doc
            .fontSize(18)
            .font('Helvetica-Bold')
            .text(templateData.title, { align: 'center' })
            .moveDown(1);
        }

        doc
          .fontSize(12)
          .font('Helvetica')
          .text(content, {
            align: 'justify',
            lineGap: 5,
          });

        if (templateData.showSignature) {
          doc.moveDown(3);
          doc.moveTo(200, doc.y).lineTo(400, doc.y).stroke();
          doc.moveDown(0.5);
          doc
            .fontSize(10)
            .font('Helvetica')
            .text(templateData.signatureText || 'Firma Autorizada', { align: 'center' });
        }
      });

      doc.end();

      writeStream.on('finish', () => {
        resolve({
          success: true,
          path: outputPath,
          filename: path.basename(outputPath),
        });
      });

      writeStream.on('error', (error) => {
        reject({
          success: false,
          message: 'Error al escribir el archivo PDF',
          error: error.message,
        });
      });

    } catch (error) {
      reject({
        success: false,
        message: 'Error al generar el PDF masivo',
        error: error.message,
      });
    }
  });
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

const translateGender = (gender) => {
  const translations = {
    male: 'Masculino',
    female: 'Femenino',
    other: 'Otro',
  };
  return translations[gender] || gender;
};

const translateMembershipStatus = (status) => {
  const translations = {
    member: 'Miembro',
    candidate: 'Candidato',
    regular: 'Regular',
    inactive: 'Inactivo',
    removed: 'Retirado',
  };
  return translations[status] || status;
};

const formatAddress = (address) => {
  if (!address) return '';
  const parts = [];
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.country) parts.push(address.country);
  return parts.join(', ');
};

const formatMinistries = (ministries) => {
  if (!ministries || ministries.length === 0) return 'Ninguno';
  return ministries
    .filter(m => m.isActive)
    .map(m => m.role || 'Miembro')
    .join(', ');
};

export default {
  generateLetterPDF,
  generateBulkLettersPDF,
};
