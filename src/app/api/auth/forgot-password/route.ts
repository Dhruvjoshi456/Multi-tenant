import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import jwt from 'jsonwebtoken';
import { enableCORS } from '@/lib/middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const db = getDatabase();

        // Check if user exists
        const userStmt = db.prepare('SELECT * FROM users WHERE email = ?');
        const user = userStmt.get(email);

        if (!user) {
            // Don't reveal if user exists or not for security
            return NextResponse.json({
                message: 'If an account with this email exists, a password reset link has been sent.'
            }, { status: 200 });
        }

        // Generate password reset token
        const resetToken = jwt.sign(
            { userId: user.id, email, type: 'password_reset' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Store reset token
        const insertStmt = db.prepare(
            `INSERT INTO user_tokens (user_id, token, type, expires_at, created_at)
             VALUES (?, ?, ?, datetime('now', '+1 hour'), datetime('now'))`
        );
        insertStmt.run(user.id, resetToken, 'password_reset');

        // TODO: Send password reset email
        console.log(`Password reset email for ${email}: ${resetToken}`);

        const response = NextResponse.json({
            message: 'If an account with this email exists, a password reset link has been sent.'
        }, { status: 200 });

        return enableCORS(response);

    } catch (error) {
        console.error('Forgot password error:', error);
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



