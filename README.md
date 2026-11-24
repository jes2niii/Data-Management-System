# Data Management System

Enterprise-grade data management system with centralized document management, employee management, billing monitoring, and complete audit logging.

## Tech Stack

**Backend:** Laravel 12, MySQL, Sanctum Auth, REST API
**Frontend:** React 19, Vite, Tailwind CSS, Shadcn UI, React Query
**Charts:** Recharts
**Auth:** Role-Based Access Control (RBAC)

## Requirements

- PHP 8.2+
- Composer
- Node.js 24 recommended (Vite requires 20.19+ or 22.12+)
- MySQL 8.0
- Git

## Quick Start

### 1. Clone & Install

```bash
git clone <repository-url>
cd Data-Management-System
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env

# Edit .env with your MySQL credentials
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=data_management
DB_USERNAME=dms_user
DB_PASSWORD=your_password

# Install dependencies
composer install

# Generate app key
php artisan key:generate

# Apply pending migrations (review first and take a verified backup on existing installations)
php artisan migrate

# Create storage link
php artisan storage:link

# Start backend
php artisan serve --port=8000
```

### 3. Frontend Setup

```bash
cd ../frontend
npm ci
npm run dev
```

The app opens at **http://localhost:5173**

### 4. Provision the Administrator (New Database Only)

There are no default administrator credentials. On an empty, migrated database, supply `DMS_BOOTSTRAP_ADMIN_EMAIL` and a unique `DMS_BOOTSTRAP_ADMIN_PASSWORD` (16–72 bytes) through a protected, one-time environment, then run `php artisan db:seed`. Remove those values afterward. Do not run this seeder to upgrade an existing installation. Optional sample records require both `APP_ENV=local` (or `testing`) and `DMS_DEMO_SEED=true`.

## Docker Setup

```bash
# Supply distinct DB_ROOT_PASSWORD and DB_PASSWORD values through a protected environment first.
docker compose config --quiet

# The app will be available at http://localhost:8080
```

## Project Structure

```
├── backend/              # Laravel 12 API
│   ├── app/
│   │   ├── Http/Controllers/Api/    # API controllers
│   │   ├── Http/Middleware/         # Auth & permission middleware
│   │   ├── Http/Requests/           # Form validation
│   │   ├── Models/                  # Eloquent models
│   │   └── Services/                # Business logic
│   ├── database/migrations/         # Database schema
│   ├── database/seeders/            # Initial data
│   └── routes/api.php               # API routes
├── frontend/             # React SPA
│   └── src/
│       ├── components/ui/           # Shadcn UI components
│       ├── components/layout/       # Layout components
│       ├── pages/                   # Page components
│       ├── contexts/                # Auth context
│       ├── hooks/                   # Custom hooks
│       ├── lib/                     # API client & utilities
│       └── routes/                  # Route definitions
├── docker/               # Docker configuration
└── docker-compose.yml
```

## System Modules

- **Dashboard** - Executive overview with charts and stats
- **User Management** - CRUD users, assign roles and permissions
- **Employee Management** - Employee records, attachments, history
- **Files & Documents** - Folder hierarchy, drag-drop upload, versioning
- **Forms Repository** - Form templates with download tracking
- **Billing Monitoring** - Recurring bills, analytics, category management
- **Activity Logs** - Complete audit trail
- **Reports** - Employee, document, bill, and activity reports
- **Settings** - Company profile, email SMTP, category management
- **Roles & Permissions** - RBAC with per-module permission matrix

## Roles & Permissions

| Role | Access |
|------|--------|
| Super Admin | Full access to all modules |
| Administrator | Most modules except delete operations |
| HR | Employee management, documents, forms |
| Finance | Billing, reports, documents |
| Employee | Read-only access to basic modules |
| Viewer | Read-only access to documents and forms |

Permissions are managed per module: create, read, update, delete, export, approve.

## API Endpoints

Application API endpoints are prefixed with `/api`. Login and public branding are unauthenticated; the remaining endpoints require Sanctum authentication and, where applicable, module permissions. See [`backend/routes/api.php`](backend/routes/api.php) for the route list.

## Category Management

Categories are managed in Settings → Categories tab. Each module has its own category table:
- Bill Categories
- Form Categories
- Document Categories
- Folder Categories
- Employee Attachment Categories

## Commands

```bash
# Backend
php artisan migrate:status          # Inspect migration state
php artisan optimize:clear          # Clear all caches
php artisan storage:link            # Create storage symlink
php artisan route:list --path=api   # List API routes

# Frontend
npm run dev                         # Development server
npm run build                       # Production build
```

See [QA and release readiness](docs/qa-release-readiness.md) for CI checks and staging gates, and [Containment rollout notes](docs/containment-rollout.md) before deploying the security changes. The existing Compose build and ingress setup still need staging verification before production use.
