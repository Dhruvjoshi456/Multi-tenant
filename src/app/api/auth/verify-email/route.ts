import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import jwt from 'jsonwebtoken';
import { enableCORS } from '@/lib/middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { error: 'Verification token is required' },
                { status: 400 }
            );
        }

        const db = getDatabase();

        // Verify JWT token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as { type: string; email: string; userId: number };
        } catch (error) {
            return NextResponse.json(
                { error: 'Invalid or expired verification token' },
                { status: 400 }
            );
        }

        if (decoded.type !== 'email_verification') {
            return NextResponse.json(
                { error: 'Invalid token type' },
                { status: 400 }
            );
        }

        // Check if token exists in database and is not expired
        const tokenStmt = db.prepare(
            `SELECT * FROM user_tokens 
             WHERE token = ? AND type = 'email_verification' AND expires_at > datetime('now')`
        );
        const tokenRecord = tokenStmt.get(token);

        if (!tokenRecord) {
            return NextResponse.json(
                { error: 'Invalid or expired verification token' },
                { status: 400 }
            );
        }

        // Update user verification status
        const updateStmt = db.prepare(
            'UPDATE users SET is_verified = TRUE, updated_at = datetime("now") WHERE id = ?'
        );
        updateStmt.run(decoded.userId);

        // Delete the used token
        const deleteStmt = db.prepare(
            'DELETE FROM user_tokens WHERE id = ?'
        );
        deleteStmt.run(tokenRecord.id);

        // Get updated user info
        const userStmt = db.prepare(
            `SELECT u.*, t.name as tenant_name, t.slug as tenant_slug, t.subscription_plan
             FROM users u
             JOIN tenants t ON u.tenant_id = t.id
             WHERE u.id = ?`
        );
        const user = userStmt.get(decoded.userId);

        const response = NextResponse.json({
            message: 'Email verified successfully',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                isVerified: user.is_verified,
                tenant: {
                    id: user.tenant_id,
                    name: user.tenant_name,
                    slug: user.tenant_slug,
                    subscription_plan: user.subscription_plan
                }
            }
        }, { status: 200 });

        return enableCORS(response);

    } catch (error) {
        console.error('Email verification error:', error);
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
