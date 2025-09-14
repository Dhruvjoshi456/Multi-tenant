import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { enableCORS, handleCORSForOptions } from '@/lib/middleware';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
    // Handle CORS preflight
    const corsResponse = await handleCORS(request);
    if (corsResponse) return corsResponse;

    try {
        const {
            companyName,
            adminEmail,
            adminPassword,
            adminFirstName,
            adminLastName,
            themeColor = '#3B82F6',
            logo = null
        } = await request.json();

        // Validate input
        if (!companyName || !adminEmail || !adminPassword || !adminFirstName || !adminLastName) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(adminEmail)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Validate password strength
        if (adminPassword.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        const db = getDatabase();

        // Generate tenant slug from company name
        const tenantSlug = companyName
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);

        // Check if tenant slug already exists
        const existingTenantStmt = db.prepare('SELECT * FROM tenants WHERE slug = ?');
        const existingTenant = existingTenantStmt.get(tenantSlug);

        if (existingTenant) {
            return NextResponse.json(
                { error: 'A company with this name already exists' },
                { status: 409 }
            );
        }

        // Check if admin email already exists
        const existingUserStmt = db.prepare('SELECT * FROM users WHERE email = ?');
        const existingUser = existingUserStmt.get(adminEmail);

        if (existingUser) {
            return NextResponse.json(
                { error: 'User already exists with this email' },
                { status: 409 }
            );
        }

        // Create tenant
        const insertTenantStmt = db.prepare(`
            INSERT INTO tenants (name, slug, subscription_plan, theme_color, logo, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `);
        const tenantResult = insertTenantStmt.run(
            companyName,
            tenantSlug,
            'free',
            themeColor,
            logo
        );
        const tenantId = tenantResult.lastInsertRowid as number;

        // Hash password
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        // Create admin user
        const insertUserStmt = db.prepare(`
            INSERT INTO users (email, password, first_name, last_name, role, tenant_id, is_verified, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const now = new Date().toISOString();
        const userResult = insertUserStmt.run(
            adminEmail,
            hashedPassword,
            adminFirstName,
            adminLastName,
            'admin',
            tenantId,
            1, // Admin is auto-verified
            now,
            now
        );
        const userId = userResult.lastInsertRowid as number;

        // Generate JWT token
        const token = jwt.sign(
            {
                userId,
                email: adminEmail,
                role: 'admin',
                tenantId,
                tenantSlug
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        const response = NextResponse.json({
            message: 'Tenant created successfully',
            token,
            tenant: {
                id: tenantId,
                name: companyName,
                slug: tenantSlug,
                subscription_plan: 'free',
                theme_color: themeColor,
                logo: logo
            },
            user: {
                id: userId,
                email: adminEmail,
                firstName: adminFirstName,
                lastName: adminLastName,
                role: 'admin',
                isVerified: true
            }
        }, { status: 201 });

        return enableCORS(response);

    } catch (error) {
        console.error('Tenant creation error:', error);
        const response = NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
        return enableCORS(response);
    }
}

export async function OPTIONS(request: NextRequest) {
    return handleCORSForOptions(request);
}
