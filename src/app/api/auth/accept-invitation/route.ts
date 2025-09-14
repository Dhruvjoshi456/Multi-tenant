import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { sendWelcomeEmail } from '@/lib/email';
import { enableCORS, handleCORS } from '@/lib/middleware';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
    // Handle CORS preflight
    const corsResponse = await handleCORS(request);
    if (corsResponse) return corsResponse;

    try {
        const { token, password } = await request.json();

        if (!token || !password) {
            return NextResponse.json(
                { error: 'Token and password are required' },
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

        // Verify invitation token
        let payload;
        try {
            payload = jwt.verify(token, JWT_SECRET) as { type: string; email: string; tenantId: number; role: string; firstName: string; lastName: string };
        } catch (error) {
            return NextResponse.json(
                { error: 'Invalid or expired invitation token' },
                { status: 400 }
            );
        }

        if (payload.type !== 'invitation') {
            return NextResponse.json(
                { error: 'Invalid invitation token' },
                { status: 400 }
            );
        }

        const db = getDatabase();

        // Check if invitation exists and is valid
        const invitationStmt = db.prepare(`
            SELECT * FROM user_invitations 
            WHERE token = ? AND accepted_at IS NULL AND expires_at > datetime('now')
        `);
        const invitation = invitationStmt.get(token);

        if (!invitation) {
            return NextResponse.json(
                { error: 'Invitation not found or expired' },
                { status: 404 }
            );
        }

        // Check if user already exists
        const existingUserStmt = db.prepare('SELECT * FROM users WHERE email = ?');
        const existingUser = existingUserStmt.get(payload.email);

        if (existingUser) {
            return NextResponse.json(
                { error: 'User already exists with this email' },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const insertUserStmt = db.prepare(`
            INSERT INTO users (email, password, first_name, last_name, role, tenant_id, is_verified, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const now = new Date().toISOString();
        const userResult = insertUserStmt.run(
            payload.email,
            hashedPassword,
            payload.firstName,
            payload.lastName,
            payload.role,
            payload.tenantId,
            1, // Auto-verified via invitation
            now,
            now
        );
        const userId = userResult.lastInsertRowid as number;

        // Mark invitation as accepted
        const updateInvitationStmt = db.prepare(`
            UPDATE user_invitations 
            SET accepted_at = datetime('now'), accepted_by = ?
            WHERE token = ?
        `);
        updateInvitationStmt.run(userId, token);

        // Generate JWT token
        const authToken = jwt.sign(
            {
                userId,
                email: payload.email,
                role: payload.role,
                tenantId: payload.tenantId,
                tenantSlug: payload.tenantSlug
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Get tenant info
        const tenantStmt = db.prepare('SELECT * FROM tenants WHERE id = ?');
        const tenant = tenantStmt.get(payload.tenantId);

        // Send welcome email
        const emailSent = await sendWelcomeEmail({
            to: payload.email,
            firstName: payload.firstName,
            companyName: tenant.name
        });

        const response = NextResponse.json({
            message: emailSent
                ? 'Invitation accepted successfully! Welcome email sent.'
                : 'Invitation accepted successfully!',
            token: authToken,
            user: {
                id: userId,
                email: payload.email,
                firstName: payload.firstName,
                lastName: payload.lastName,
                role: payload.role,
                isVerified: true
            },
            tenant: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                subscription_plan: tenant.subscription_plan,
                theme_color: tenant.theme_color,
                logo: tenant.logo
            },
            emailSent
        }, { status: 201 });

        return enableCORS(response);

    } catch (error) {
        console.error('Accept invitation error:', error);
        const response = NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
        return enableCORS(response);
    }
}

export async function OPTIONS(request: NextRequest) {
    return handleCORS(request);
}
