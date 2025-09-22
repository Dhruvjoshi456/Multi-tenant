import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { getDatabase } from '@/lib/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { enableCORS } from '@/lib/middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
    try {
        const { email, password, firstName, lastName, tenantSlug } = await request.json();

        // Validate input
        if (!email || !password || !firstName || !lastName || !tenantSlug) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Validate password strength
        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        const db = await getDatabase();

        // Normalize the tenant slug in case a company name was provided instead of the slug
        const normalizedSlug = String(tenantSlug)
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);

        // Check if tenant exists
        const tenantStmt = db.prepare('SELECT * FROM tenants WHERE slug = ?');
        const tenant = await tenantStmt.get([normalizedSlug]) as { id: number; name: string; slug: string } | undefined;

        if (!tenant) {
            return NextResponse.json(
                { error: 'Tenant not found' },
                { status: 404 }
            );
        }

        // Check if user already exists
        const existingUserStmt = db.prepare('SELECT * FROM users WHERE email = ?');
        const existingUser = await existingUserStmt.get(email);

        if (existingUser) {
            return NextResponse.json(
                { error: 'User already exists with this email' },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const insertUserStmt = db.prepare(
            `INSERT INTO users (email, password, first_name, last_name, role, tenant_id, is_verified, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        const now = new Date().toISOString();
        const result = await insertUserStmt.run([email, hashedPassword, firstName, lastName, 'member', tenant.id, 0, now, now]);

        const userId = result.lastInsertRowid as number;

        // Generate verification token
        const verificationToken = jwt.sign(
            { userId, email, type: 'email_verification' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Store verification token
        const insertTokenStmt = db.prepare(
            `INSERT INTO user_tokens (user_id, token, type, expires_at, created_at)
             VALUES (?, ?, ?, ?, ?)`
        );
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now
        await insertTokenStmt.run([userId, verificationToken, 'email_verification', expiresAt, now]);

        // TODO: Send verification email
        console.log(`Verification email for ${email}: ${verificationToken}`);

        const response = NextResponse.json({
            message: 'User registered successfully. Please check your email for verification.',
            user: {
                id: userId,
                email,
                firstName,
                lastName,
                role: 'member',
                tenant: {
                    id: tenant.id,
                    name: tenant.name,
                    slug: tenant.slug
                },
                isVerified: false
            }
        }, { status: 201 });

        return enableCORS(response);

    } catch (error) {
        console.error('Registration error:', error);
        const response = NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
        return enableCORS(response);
    }
}

export async function OPTIONS(request: NextRequest) {
    return enableCORS(new NextResponse(null, { status: 200 }));
}



