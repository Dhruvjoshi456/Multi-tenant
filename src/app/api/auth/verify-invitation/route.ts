import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import jwt from 'jsonwebtoken';
import { enableCORS, handleCORSForOptions } from '@/lib/middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            const response = NextResponse.json(
                { error: 'Invitation token is required' },
                { status: 400 }
            );
            return enableCORS(response);
        }

        // Verify JWT token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as { type: string; email: string; tenantId: number; role: string; firstName: string; lastName: string };
        } catch (error) {
            const response = NextResponse.json(
                { error: 'Invalid or expired invitation token' },
                { status: 400 }
            );
            return enableCORS(response);
        }

        if (decoded.type !== 'invitation') {
            const response = NextResponse.json(
                { error: 'Invalid invitation token' },
                { status: 400 }
            );
            return enableCORS(response);
        }

        const db = getDatabase();

        // Check if invitation exists and is still valid
        const invitationStmt = db.prepare(`
            SELECT ui.*, t.name as company_name
            FROM user_invitations ui
            JOIN tenants t ON ui.tenant_id = t.id
            WHERE ui.token = ? AND ui.accepted_at IS NULL AND ui.expires_at > datetime('now')
        `);
        const invitation = invitationStmt.get(token);

        if (!invitation) {
            const response = NextResponse.json(
                { error: 'Invitation not found, expired, or already accepted' },
                { status: 404 }
            );
            return enableCORS(response);
        }

        // Check if user already exists in this tenant
        const existingUserStmt = db.prepare(`
            SELECT * FROM users 
            WHERE email = ? AND tenant_id = ?
        `);
        const existingUser = existingUserStmt.get(decoded.email, decoded.tenantId);

        if (existingUser) {
            const response = NextResponse.json(
                { error: 'User is already a member of this organization' },
                { status: 409 }
            );
            return enableCORS(response);
        }

        const response = NextResponse.json({
            invitation: {
                email: invitation.email,
                firstName: invitation.first_name,
                lastName: invitation.last_name,
                role: invitation.role,
                companyName: invitation.company_name,
                expiresAt: invitation.expires_at
            }
        });

        return enableCORS(response);

    } catch (error) {
        console.error('Verify invitation error:', error);
        const response = NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
        return enableCORS(response);
    }
}

export function OPTIONS(request: NextRequest) {
    return handleCORSForOptions(request);
}
