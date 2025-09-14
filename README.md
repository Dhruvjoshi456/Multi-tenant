# Multi-Tenant SaaS Notes Application

A multi-tenant SaaS notes application built with Next.js, featuring role-based access control, subscription management, and tenant isolation.

## Architecture

### Multi-Tenancy Approach
This application uses a **shared schema with tenant_id** approach for multi-tenancy:

- All tables include a `tenant_id` column to ensure data isolation
- Database queries always filter by `tenant_id` to prevent cross-tenant data access
- Tenant information is stored in a separate `tenants` table
- Users are associated with tenants through the `tenant_id` foreign key

### Database Schema
- **tenants**: Stores tenant information (name, slug, subscription_plan)
- **users**: Stores user accounts with role-based access (admin/member)
- **notes**: Stores notes with tenant isolation

### Security Features
- JWT-based authentication
- Role-based access control (Admin/Member)
- Tenant data isolation enforced at the database level
- Subscription-based feature gating

## Test Accounts

All test accounts use the password: `password`

| Email | Role | Tenant | Subscription |
|-------|------|--------|--------------|
| admin@acme.test | Admin | Acme | Free |
| user@acme.test | Member | Acme | Free |
| admin@globex.test | Admin | Globex | Free |
| user@globex.test | Member | Globex | Free |

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Notes (CRUD)
- `GET /api/notes` - List all notes for current tenant
- `POST /api/notes` - Create a new note
- `GET /api/notes/:id` - Get specific note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

### Tenant Management
- `POST /api/tenants/:slug/upgrade` - Upgrade tenant to Pro (Admin only)

### Health Check
- `GET /api/health` - Health endpoint

## Subscription Plans

### Free Plan
- Maximum 3 notes per tenant
- All CRUD operations available
- Admin can upgrade to Pro

### Pro Plan
- Unlimited notes
- All features available

## Features

### Role-Based Access Control
- **Admin**: Can invite users and upgrade subscriptions
- **Member**: Can create, view, edit, and delete notes

### Tenant Isolation
- Strict data isolation between tenants
- Users can only access data from their own tenant
- All API endpoints enforce tenant boundaries

### Subscription Gating
- Free plan limited to 3 notes
- Pro plan has unlimited notes
- Upgrade functionality available to admins

## Deployment on Vercel

### Prerequisites
1. Vercel account
2. Git repository with this code

### Environment Variables
Set the following environment variable in Vercel:

```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### Deployment Steps
1. Connect your GitHub repository to Vercel
2. Set the `JWT_SECRET` environment variable
3. Deploy the application

The application will automatically:
- Create the SQLite database in `/tmp/database.sqlite`
- Seed the database with test tenants and users
- Enable CORS for API access

### CORS Configuration
CORS is enabled for all API endpoints to allow automated testing and dashboard access.

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
# Create .env.local file
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Testing

The application includes test accounts for automated testing:

- Health endpoint: `GET /health`
- Authentication with all test accounts
- Tenant isolation verification
- Role-based access control
- Subscription limit enforcement
- CRUD operations for notes
- Tenant upgrade functionality

## Security Considerations

- JWT tokens expire after 24 hours
- Passwords are hashed using bcrypt
- All database queries include tenant filtering
- CORS is configured for cross-origin requests
- Input validation on all API endpoints

## Database

The application uses SQLite for simplicity and easy deployment. In production, consider using:
- PostgreSQL with proper connection pooling
- Database migrations for schema changes
- Backup and recovery strategies
- Connection encryption

## Frontend

The frontend is built with:
- Next.js 15 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- React Context for state management
- Responsive design for mobile and desktop