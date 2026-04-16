# SGM-Sallem - Sistema de Gestión de Iglesia Evangélica

## Descripción
Sistema de Gestión Multi-tenant para Iglesias Evangélicas (SGM-Sallem) v1.0

Aplicación web SaaS que centraliza la gestión de miembros, ministerios, relaciones familiares, documentos, notificaciones y suscripciones para múltiples iglesias dentro de una sola plataforma, manteniendo aislamiento lógico de datos por tenant.

## Características Principales

### Multi-tenant
- Aislamiento lógico de datos por iglesia
- Suscripción y configuración independiente por tenant
- Límites configurables de miembros y usuarios

### Actores y Permisos
- **Super Administrador**: Gestión global de tenants, soporte y auditoría
- **Administrador de Iglesia**: Control completo de miembros, ministerios, usuarios y configuración
- **Gestor**: Operaciones diarias con registros, asignaciones y cartas
- **Consulta**: Solo visualización de información

### Módulos Funcionales
1. **Autenticación**: Login, JWT, refresh token, recuperación de contraseña
2. **Usuarios**: CRUD, roles, límites por plan
3. **Miembros**: Datos personales, eclesiales, ministerios, historial
4. **Ministerios**: Grupos, roles, jerarquías, asignaciones
5. **Árbol Genealógico**: Relaciones familiares, visualización interactiva
6. **Plantillas y Cartas**: Editor, variables dinámicas, generación PDF
7. **Notificaciones**: Cumpleaños, aniversarios, alertas automáticas
8. **Dashboard**: Métricas, widgets, accesos rápidos
9. **Suscripción**: Control de pagos, estados, bloqueos
10. **Auditoría**: Logs completos de todas las acciones

## Stack Tecnológico

### Backend
- Node.js + Express
- MongoDB 6.0+ con Mongoose
- JWT para autenticación
- bcrypt para contraseñas
- pdfkit para generación de PDFs
- node-cron para tareas programadas

### Frontend
- React 19 + TypeScript
- Vite
- TailwindCSS
- React Router
- React Hook Form + Zod
- XYFlow (árbol genealógico)
- Recharts (gráficos)

## Instalación

### Prerrequisitos
- Node.js 18+
- MongoDB 6.0+
- npm o yarn

### Backend

```bash
cd server
npm install
cp .env.example .env
# Editar .env con tus configuraciones
npm run dev
```

### Frontend

```bash
cd client
npm install
npm run dev
```

## Variables de Entorno

Ver `.env.example` en la raíz del proyecto:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sgm-sallem
JWT_SECRET=tu_secreto_super_seguro
JWT_EXPIRE=24h
FRONTEND_URL=http://localhost:5173
```

## API Endpoints

### Autenticación
- `POST /api/v1/auth/register-tenant` - Registrar nueva iglesia
- `POST /api/v1/auth/login` - Iniciar sesión
- `GET /api/v1/auth/me` - Obtener usuario actual
- `PUT /api/v1/auth/update-profile` - Actualizar perfil
- `PUT /api/v1/auth/change-password` - Cambiar contraseña

### Miembros
- `GET /api/v1/members` - Listar miembros (con filtros y paginación)
- `GET /api/v1/members/:id` - Obtener miembro por ID
- `POST /api/v1/members` - Crear miembro
- `PUT /api/v1/members/:id` - Actualizar miembro
- `DELETE /api/v1/members/:id` - Eliminar miembro (soft delete)
- `PATCH /api/v1/members/:id/restore` - Restaurar miembro
- `POST /api/v1/members/import` - Importación masiva
- `GET /api/v1/members/export` - Exportar miembros
- `GET /api/v1/members/stats` - Estadísticas

### Ministerios
- `GET /api/v1/ministries` - Listar ministerios
- `GET /api/v1/ministries/:id` - Obtener ministerio
- `POST /api/v1/ministries` - Crear ministerio
- `PUT /api/v1/ministries/:id` - Actualizar ministerio
- `DELETE /api/v1/ministries/:id` - Eliminar ministerio
- `POST /api/v1/ministries/:id/assign-member` - Asignar miembro
- `DELETE /api/v1/ministries/:id/remove-member/:memberId` - Remover miembro

### Plantillas y Cartas
- `GET /api/v1/templates` - Listar plantillas
- `POST /api/v1/templates` - Crear plantilla
- `PUT /api/v1/templates/:id` - Actualizar plantilla
- `DELETE /api/v1/templates/:id` - Eliminar plantilla
- `POST /api/v1/templates/generate` - Generar carta individual
- `POST /api/v1/templates/generate-bulk` - Generación masiva
- `GET /api/v1/templates/history` - Historial de cartas

### Notificaciones
- `GET /api/v1/notifications` - Listar notificaciones
- `GET /api/v1/notifications/unread-count` - Conteo no leídas
- `PUT /api/v1/notifications/:id/read` - Marcar como leída
- `PUT /api/v1/notifications/read-all` - Marcar todas como leídas
- `POST /api/v1/notifications` - Crear notificación manual

## Modelo de Datos

### Colecciones Principales
- `tenants` - Iglesias/organizaciones
- `users` - Usuarios del sistema
- `members` - Miembros de la iglesia
- `ministries` - Ministerios/grupos
- `family_relations` - Relaciones familiares
- `letter_templates` - Plantillas de cartas
- `generated_letters` - Cartas generadas
- `notifications` - Notificaciones
- `audit_logs` - Logs de auditoría
- `configurations` - Configuraciones

## Reglas de Negocio

1. **Unicidad de cédula**: No puede haber miembros con misma identificación por tenant
2. **Soft delete**: Los miembros no se eliminan físicamente
3. **Relaciones familiares**: No se permiten auto-relaciones ni duplicados
4. **Plantillas del sistema**: No son editables, solo duplicables
5. **Tenant bloqueado**: No puede operar si está en morosidad
6. **Último admin**: Cada iglesia debe tener al menos un administrador activo
7. **Asignación múltiple**: Un miembro puede estar en varios ministerios

## Requisitos No Funcionales

- **Rendimiento**: Páginas principales < 3s con 500 miembros
- **Búsquedas**: Respuesta < 1 segundo
- **PDF individual**: Generación < 5 segundos
- **Disponibilidad**: 99% mensual
- **Respaldos**: Diarios con retención de 30 días
- **RTO**: 4 horas
- **RPO**: 24 horas
- **Auditoría**: Retención mínima de 12 meses

## Seguridad

- HTTPS obligatorio en producción
- Contraseñas con bcrypt (12 rounds)
- Validación y sanitización de entradas
- Protección contra XSS e inyección NoSQL
- Rate limiting configurable
- Expiración de sesión
- Filtros por tenant en todas las consultas
- Validación de roles en backend

## Estructura del Proyecto

```
sgm-sallem/
├── server/
│   ├── src/
│   │   ├── config/         # Configuración de DB
│   │   ├── controllers/    # Controladores
│   │   ├── middleware/     # Middlewares (auth, audit, error)
│   │   ├── models/         # Modelos Mongoose
│   │   ├── routes/         # Rutas API
│   │   ├── services/       # Servicios de negocio
│   │   └── index.js        # Entry point
│   ├── public/             # Archivos estáticos
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas
│   │   ├── services/       # Servicios API
│   │   ├── context/        # Contextos React
│   │   ├── hooks/          # Custom hooks
│   │   └── utils/          # Utilidades
│   └── package.json
├── .env.example
└── README.md
```

## Desarrollo

El sistema sigue una arquitectura RESTful con separación clara entre frontend y backend. Todas las APIs están versionadas bajo `/api/v1` y responden en formato JSON.

## Licencia

MIT

## Autor

javzdev - Abril 2026
