# SmartSales365 Monorepo

Plataforma monorepo con backend Django REST, frontend web en React/Vite y app movil Flutter para la suite SmartSales365.

## Estructura

- `backend/` � API Django/DRF con autenticacion JWT, catalogo, clientes, verificacion por correo y seeding de datos demo.
- `frontend-web/` � Panel administrativo React (Vite + TypeScript) con CRUD para productos, categorias, clientes y usuarios.
- `frontend-movil/` � App Flutter con flujo de autenticacion, verificacion y pantalla placeholder para futuras funcionalidades.

## Requisitos

- Python 3.11+
- Node.js 18+ y npm
- Flutter 3.35+
- PostgreSQL 14+ (variables de conexion via `.env`)

## Variables de entorno

Copiar el archivo de ejemplo y ajustar credenciales y correo SMTP:

```bash
cp backend/.env.example backend/.env
```

Variables principales:

```
DJANGO_SECRET_KEY=changeme
DEBUG=true
ALLOWED_HOSTS=localhost,127.0.0.1
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smartsales365
DB_USER=postgres
DB_PASS=postgres
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_HOST_USER=correo@example.com
EMAIL_HOST_PASSWORD=app-password
EMAIL_USE_SSL=true
EMAIL_USE_TLS=false
EMAIL_FROM="SmartSales365 <correo@example.com>"
FRONTEND_BASE_URL=http://localhost:5173
```

Para el frontend web crear `.env`:

```
VITE_API_BASE=http://localhost:8000/api
```

## Comandos rapidos (Makefile)

```bash
make install    # instala dependencias backend/frontend
make migrate    # aplica migraciones Django
make run        # levanta backend en http://localhost:8000
make seed       # crea datos demo (admin@demo.com / Admin123!)
make test       # ejecuta tests backend (Django)
```

## Backend

1. Crear y activar entorno virtual (opcional).
2. `make install`
3. Configurar `backend/.env` con BD y correo.
4. `make migrate`
5. `make seed`
6. `make run`

Endpoints relevantes:

- Autenticacion: `POST /api/auth/login/`, `POST /api/auth/refresh/`
- Verificacion: `POST /api/auth/verify/`, `POST /api/auth/resend-verification/`
- Recuperacion: `POST /api/auth/password/reset/`, `POST /api/auth/password/confirm/`
- CRUD de usuarios, categorias, productos y clientes bajo `/api/...`
- Documentacion: `/api/schema/` (OpenAPI) y `/api/docs/` (Swagger UI)

Cada usuario nuevo recibe un codigo por correo. Sin verificacion no se genera JWT. El endpoint de login reenvia automaticamente el codigo si la cuenta sigue pendiente.

## Frontend web

```bash
cd frontend-web
npm install
npm run dev # http://localhost:5173
```

Caracteristicas destacadas:

- Login con manejo de estados de verificacion y mensajes de error claros.
- Pantalla dedicada para ingresar codigo y reenviar correos.
- Flujos de recuperacion y restablecimiento de contrasena con codigo.
- Layout administrativo con sidebar/topbar y CRUD completo de productos (imagenes, caracteristicas), categorias, clientes y usuarios.
- Filtros (categoria, estado), busqueda y validaciones UI.

## Frontend movil

```bash
cd frontend-movil
flutter pub get
flutter run
```

La app incluye:

- Pantallas de login, verificacion por codigo y recuperacion basica.
- Almacenamiento seguro de tokens mediante `flutter_secure_storage`.
- Placeholder para funcionalidades de compras/reportes en siguientes sprints.
- Rutas configuradas (`/forgot-password`, `/reset-password`) y controlador centralizado de estado.

## Flujo recomendado de verificacion

1. Registrar usuario (o crear desde admin). El sistema envia codigo via SMTP.
2. El usuario ingresa el codigo en `/verify-email` (web) o pantalla homonima en la app Flutter.
3. Tras verificar puede iniciar sesion con normalidad.
4. Para recuperar contrasena: solicitar codigo (`/forgot-password`), recibir correo y confirmar en `/reset-password`.

## Verificacion manual sugerida

1. Abrir `http://localhost:8000/api/docs/` y probar login, verificacion y recuperacion.
2. Desde Swagger crear categoria y producto con `images[]` y `features[]`.
3. Iniciar sesion en frontend web, verificar cuenta, crear producto y confirmar filtros.
4. Ejecutar app Flutter, intentar login con usuario sin verificar (debe redirigir a pantalla de codigo) y luego acceder a la pantalla placeholder tras verificar.
