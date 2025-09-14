# Vercel Deployment Guide

## Prerequisites
- GitHub repository with your code
- Vercel account
- Vercel CLI (optional)

## Step 1: Set up Vercel Postgres Database

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Sign in to your account

2. **Create a New Project**
   - Click "New Project"
   - Import your GitHub repository
   - Choose a unique project name (e.g., `multi-tenant-notes-app`)

3. **Add Vercel Postgres Database**
   - In your project dashboard, go to **Storage** tab
   - Click **Create Database**
   - Select **Postgres**
   - Choose a database name (e.g., `notes-db`)
   - Select a region close to your users
   - Click **Create**

4. **Get Database Connection String**
   - After creating the database, go to **Settings** → **Environment Variables**
   - Copy the `DATABASE_URL` value
   - This will be automatically added to your environment variables

## Step 2: Configure Environment Variables

Add these environment variables in Vercel:

### Required Variables:
1. **JWT_SECRET**
   - Value: `e55a0d430a3c0b00afcafa842f570c0a8180ad72f335080ccd86cb3825b5ed033e8a0d9104890a1206b90fd0992352246be8`

2. **DATABASE_URL**
   - Value: (Automatically provided by Vercel Postgres)
   - Format: `postgres://username:password@host:port/database`

3. **NEXTAUTH_URL**
   - Value: `https://your-project-name.vercel.app`
   - Replace with your actual Vercel URL

### Optional Variables (for email functionality):
4. **SMTP_HOST**
   - Value: `smtp.gmail.com` (or your email provider)

5. **SMTP_PORT**
   - Value: `587`

6. **SMTP_USER**
   - Value: `your-email@gmail.com`

7. **SMTP_PASS**
   - Value: `your-app-password`

8. **SMTP_FROM**
   - Value: `your-email@gmail.com`

## Step 3: Deploy Configuration

### Vercel Settings:
- **Framework Preset**: Next.js
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install`

### Build Command Override:
The `vercel.json` file will automatically run the database migration after build.

## Step 4: Deploy

1. **Deploy from Vercel Dashboard**
   - Click **Deploy** button
   - Wait for the build to complete

2. **Or Deploy from CLI**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

## Step 5: Verify Deployment

1. **Check Database Migration**
   - The migration will run automatically during build
   - Check the build logs for "✅ PostgreSQL database migration completed successfully"

2. **Test the Application**
   - Visit your Vercel URL
   - Try creating a new account
   - Test the notes functionality

## Troubleshooting

### Common Issues:

1. **Database Connection Error**
   - Ensure `DATABASE_URL` is correctly set
   - Check if the database is created and accessible

2. **Migration Failed**
   - Check build logs for migration errors
   - Ensure the database user has proper permissions

3. **JWT Secret Error**
   - Ensure `JWT_SECRET` is set as an environment variable
   - Make sure it's not referencing a non-existent secret

4. **Build Fails**
   - Check that all dependencies are installed
   - Ensure TypeScript compilation passes

### Manual Database Migration:
If automatic migration fails, you can run it manually:

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="your-postgres-connection-string"

# Run migration
npm run migrate:postgres
```

## Production Considerations

1. **Database Backups**
   - Set up regular backups for your Postgres database
   - Consider using Vercel's backup features

2. **Environment Security**
   - Never commit sensitive environment variables
   - Use Vercel's secret management for sensitive data

3. **Performance**
   - Monitor database performance
   - Consider connection pooling for high traffic

4. **Monitoring**
   - Set up error tracking (Sentry, etc.)
   - Monitor application performance

## Support

If you encounter issues:
1. Check Vercel build logs
2. Verify environment variables
3. Test database connectivity
4. Check application logs in Vercel dashboard
