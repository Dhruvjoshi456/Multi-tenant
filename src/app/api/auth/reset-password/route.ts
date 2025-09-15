import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { enableCORS } from '@/lib/middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
    try {
        const { token, newPassword } = await request.json();

        if (!token || !newPassword) {
            return NextResponse.json(
                { error: 'Token and new password are required' },
                { status: 400 }
            );
        }

        // Validate password strength
        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters long' },
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
                { error: 'Invalid or expired reset token' },
                { status: 400 }
            );
        }

        if (decoded.type !== 'password_reset') {
            return NextResponse.json(
                { error: 'Invalid token type' },
                { status: 400 }
            );
        }

        // Check if token exists in database and is not expired
        const tokenStmt = db.prepare(
            `SELECT * FROM user_tokens 
             WHERE token = ? AND type = 'password_reset' AND expires_at > datetime('now')`
        );
        const tokenRecord = await tokenStmt.get(token) as { id: number; user_id: number; token: string; type: string; expires_at: string; created_at: string } | null;

        if (!tokenRecord) {
            return NextResponse.json(
                { error: 'Invalid or expired reset token' },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update user password
        const updateStmt = db.prepare(
            'UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?'
        );
        await updateStmt.run(hashedPassword, decoded.userId);

        // Delete the used token
        const deleteTokenStmt = db.prepare(
            'DELETE FROM user_tokens WHERE id = ?'
        );
        await deleteTokenStmt.run(tokenRecord.id);

        // Invalidate all refresh tokens for this user
        const deleteRefreshStmt = db.prepare(
            'DELETE FROM user_tokens WHERE user_id = ? AND type = "refresh_token"'
        );
        await deleteRefreshStmt.run(decoded.userId);

        const response = NextResponse.json({
            message: 'Password reset successfully'
        }, { status: 200 });

        return enableCORS(response);

    } catch (error) {
        console.error('Reset password error:', error);
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



