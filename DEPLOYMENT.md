# Deployment Guide

## Vercel Deployment

### Step 1: Prepare Repository
1. Push your code to a GitHub repository
2. Ensure all files are committed and pushed

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - Framework Preset: Next.js
   - Root Directory: `./` (default)
   - Build Command: `npm run build`
   - Output Directory: `.next` (default)

### Step 3: Set Environment Variables
In the Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add the following variable:
   - Name: `JWT_SECRET`
   - Value: `your-super-secret-jwt-key-change-this-in-production`
   - Environment: Production, Preview, Development

### Step 4: Deploy
1. Click "Deploy"
2. Wait for the deployment to complete
3. Your application will be available at the provided Vercel URL

## Testing the Deployment

### Health Check
```bash
curl https://your-app.vercel.app/api/health
```
Expected response: `{"status":"ok"}`

### Login Test
```bash
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.test","password":"password"}'
```

### Notes API Test
```bash
# Get the token from login response, then:
curl https://your-app.vercel.app/api/notes \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Environment Variables

### Required
- `JWT_SECRET`: Secret key for JWT token signing

### Optional
- `NODE_ENV`: Set to "production" for production builds

## Database

The application uses SQLite which is automatically created in `/tmp/database.sqlite` on Vercel. The database is initialized with:
- Two tenants: Acme and Globex
- Four test users with the specified credentials
- All with Free subscription plans initially

## CORS Configuration

CORS is enabled for all API endpoints to allow:
- Automated testing scripts
- Dashboard access
- Cross-origin requests

## Monitoring

Monitor your deployment through:
- Vercel dashboard analytics
- Function logs in Vercel dashboard
- Health endpoint monitoring

## Troubleshooting

### Common Issues
1. **Database not found**: The database is created automatically on first request
2. **CORS errors**: CORS is configured in the middleware
3. **Authentication failures**: Check JWT_SECRET environment variable
4. **Build failures**: Ensure all dependencies are in package.json

### Logs
Check Vercel function logs for detailed error information.

## Security Notes

- Change the JWT_SECRET in production
- Consider using environment-specific secrets
- Monitor for unusual API usage patterns
- Regularly update dependencies
