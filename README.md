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
- Node.js 20+
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
DB_USERNAME=root
DB_PASSWORD=your_password

# Install dependencies
composer install

# Generate app key
php artisan key:generate

# Run migrations and seed
php artisan migrate:fresh --seed

# Create storage link
php artisan storage:link

# Start backend
php artisan serve --port=8000
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

The app opens at **http://localhost:5173**

### 4. Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@admin.com | password |
| Administrator | admin2@admin.com | password |

## Docker Setup

```bash
# Start all services (MySQL, backend, frontend, nginx, queue worker, scheduler)
docker-compose up -d

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

All endpoints are prefixed with `/api` and require authentication (except login/logout). See `routes/api.php` for the complete route list.

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
php artisan migrate:fresh --seed    # Reset database with fresh data
php artisan optimize:clear          # Clear all caches
php artisan storage:link            # Create storage symlink
php artisan route:list --path=api   # List API routes

# Frontend
npm run dev                         # Development server
npm run build                       # Production build
```
