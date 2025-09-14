import { NextRequest } from 'next/server';
import { getDatabase } from './database';

interface RateLimitConfig {
    windowMs: number; // Time window in milliseconds
    maxAttempts: number; // Maximum attempts per window
    blockDurationMs: number; // How long to block after exceeding limit
}

const defaultConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5, // 5 attempts per 15 minutes
    blockDurationMs: 30 * 60 * 1000 // Block for 30 minutes
};

export async function checkRateLimit(
    request: NextRequest,
    identifier: string,
    config: RateLimitConfig = defaultConfig
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const db = getDatabase();
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);
    const blockStart = new Date(now.getTime() - config.blockDurationMs);

    try {
        // Check if currently blocked
        const blockedStmt = db.prepare(
            `SELECT COUNT(*) as count FROM login_attempts 
             WHERE email = ? AND success = FALSE AND created_at > ?`
        );
        const blockedAttempts = blockedStmt.get(identifier, blockStart.toISOString());

        if (blockedAttempts.count >= config.maxAttempts) {
            return {
                allowed: false,
                remaining: 0,
                resetTime: new Date(now.getTime() + config.blockDurationMs).getTime()
            };
        }

        // Count attempts in current window
        const recentStmt = db.prepare(
            `SELECT COUNT(*) as count FROM login_attempts 
             WHERE email = ? AND created_at > ?`
        );
        const recentAttempts = recentStmt.get(identifier, windowStart.toISOString());

        const remaining = Math.max(0, config.maxAttempts - recentAttempts.count);
        const allowed = remaining > 0;

        return {
            allowed,
            remaining,
            resetTime: new Date(now.getTime() + config.windowMs).getTime()
        };

    } catch (error) {
        console.error('Rate limit check error:', error);
        // Fail open - allow request if rate limiting fails
        return {
            allowed: true,
            remaining: config.maxAttempts,
            resetTime: new Date(now.getTime() + config.windowMs).getTime()
        };
    }
}

export async function recordLoginAttempt(
    identifier: string,
    success: boolean,
    ipAddress: string
): Promise<void> {
    const db = getDatabase();

    try {
        const stmt = db.prepare(
            `INSERT INTO login_attempts (email, ip_address, success, created_at)
             VALUES (?, ?, ?, datetime('now'))`
        );
        stmt.run(identifier, ipAddress, success ? 1 : 0);
    } catch (error) {
        console.error('Failed to record login attempt:', error);
    }
}

export function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');

    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    if (realIP) {
        return realIP;
    }

    return 'unknown';
}



