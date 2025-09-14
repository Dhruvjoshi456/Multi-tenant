# 🚀 Multi-Tenant Notes Application

A modern, full-stack note-taking application built with Next.js 15, TypeScript, and SQLite. Features multi-tenant architecture, role-based access control, and a beautiful glassmorphism UI.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?style=for-the-badge&logo=tailwind-css)
![SQLite](https://img.shields.io/badge/SQLite-3.0-003B57?style=for-the-badge&logo=sqlite)

## ✨ Features

### 🏢 Multi-Tenant Architecture
- **Isolated Data**: Each organization has completely separate data
- **Tenant Management**: Create and manage multiple company workspaces
- **Scalable Design**: Built to handle thousands of tenants

### 🔐 Security & Authentication
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Admin and Member roles with different permissions
- **Password Security**: bcrypt hashing with salt rounds
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive validation and sanitization

### 📝 Advanced Notes Management
- **Rich Text Support**: Create and edit notes with formatting
- **Tags & Categories**: Organize notes with custom tags and categories
- **Search & Filter**: Full-text search with advanced filtering options
- **Archive System**: Soft delete with restore functionality
- **Real-time Updates**: Live time display and dynamic UI

### 👥 User Management
- **User Invitations**: Admins can invite users via email
- **Email Notifications**: Welcome emails and invitation links
- **Profile Management**: User profiles with tenant information

### 💳 Subscription Management
- **Free Plan**: Limited to 3 notes per tenant
- **Pro Plan**: Unlimited notes and advanced features
- **Plan Management**: Admins can upgrade/downgrade plans
- **Feature Restrictions**: Plan-based feature access

### 🎨 Modern UI/UX
- **Glassmorphism Design**: Modern, professional interface
- **Responsive Layout**: Mobile-first, works on all devices
- **Dark Theme**: Beautiful dark gradient backgrounds
- **Smooth Animations**: Hover effects and transitions
- **Accessibility**: Proper ARIA labels and keyboard navigation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Djclash557/Multi-tenant.git
cd Multi-tenant
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
# Create .env.local file
cp .env.example .env.local

# Edit .env.local with your configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Configure SMTP for email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 🧪 Testing the Application

### Create Your First Company
1. Click "Create New Company" on the login page
2. Fill in your company details
3. You'll be automatically logged in as admin

### Test Features
- **Create Notes**: Add notes with tags and categories
- **Search & Filter**: Test the search functionality
- **Admin Features**: Invite users, manage subscription plans
- **Mobile View**: Test responsive design on different screen sizes

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: SQLite with better-sqlite3
- **Authentication**: JWT with bcryptjs
- **Email**: Nodemailer with SMTP support

### Database Schema
```sql
-- Tenants (Organizations)
tenants: id, name, slug, subscription_plan, theme_color

-- Users
users: id, email, password, first_name, last_name, role, tenant_id

-- Notes
notes: id, title, content, tenant_id, created_by, tags, category, is_archived
```

### API Endpoints
- **Authentication**: `/api/auth/*` (login, register, verify)
- **Notes**: `/api/notes/*` (CRUD operations, search, filter)
- **Tenants**: `/api/tenants/*` (create, upgrade, invite)

## 🔧 Configuration

### Environment Variables
```env
# Required
JWT_SECRET=your-super-secret-jwt-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional - Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Database
The SQLite database is created automatically on first run. No additional setup required.

## 📱 Screenshots

### Login Page
- Modern glassmorphism design
- Password visibility toggle
- Integrated company creation

### Dashboard
- Notes management interface
- Search and filtering
- Real-time clock display
- Admin controls

### Mobile Responsive
- Optimized for all screen sizes
- Touch-friendly interface
- Smooth animations

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on every push

### Other Platforms
- **Netlify**: Static export with API functions
- **Railway**: Full-stack deployment
- **DigitalOcean**: VPS deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Features Roadmap

- [ ] Real-time collaboration
- [ ] File attachments
- [ ] Advanced search with Elasticsearch
- [ ] Mobile app (React Native)
- [ ] Analytics dashboard
- [ ] API rate limiting
- [ ] Webhook support

## 🐛 Troubleshooting

### Common Issues
- **Port 3000 in use**: App will automatically use port 3001 or 3002
- **Database errors**: Delete `database.sqlite` and restart
- **Email not working**: Configure SMTP settings in `.env.local`

### Getting Help
- Check the [Issues](https://github.com/Djclash557/Multi-tenant/issues) page
- Create a new issue with detailed description
- Include error logs and steps to reproduce

## 🙏 Acknowledgments

- **Next.js Team** for the amazing framework
- **Tailwind CSS** for the utility-first CSS framework
- **Heroicons** for the beautiful icons
- **SQLite** for the lightweight database

## 📞 Contact

**Dhruv Joshi** - [@Djclash557](https://github.com/Djclash557)

Project Link: [https://github.com/Djclash557/Multi-tenant](https://github.com/Djclash557/Multi-tenant)

---

⭐ **Star this repository if you found it helpful!**