import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, generateToken } from '@/lib/auth';
import { enableCORS, handleCORS, handleCORSForOptions } from '@/lib/middleware';
import { checkRateLimit, recordLoginAttempt, getClientIP } from '@/lib/rateLimiter';

export async function POST(request: NextRequest) {
    // Handle CORS preflight
    const corsResponse = await handleCORS(request);
    if (corsResponse) return corsResponse;

    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            const response = NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
            return enableCORS(response);
        }

        // Check rate limit
        const ipAddress = getClientIP(request);
        const rateLimit = await checkRateLimit(request, email);

        if (!rateLimit.allowed) {
            const response = NextResponse.json(
                {
                    error: 'Too many login attempts. Please try again later.',
                    resetTime: rateLimit.resetTime
                },
                { status: 429 }
            );
            return enableCORS(response);
        }

        const user = await authenticateUser(email, password);

        if (!user) {
            // Record failed attempt
            await recordLoginAttempt(email, false, ipAddress);

            const response = NextResponse.json(
                {
                    error: 'Invalid credentials',
                    remaining: rateLimit.remaining - 1
                },
                { status: 401 }
            );
            return enableCORS(response);
        }

        // Record successful attempt
        await recordLoginAttempt(email, true, ipAddress);

        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenant_id,
            tenantSlug: user.tenant_slug
        });

        const response = NextResponse.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                tenant: {
                    id: user.tenant_id,
                    slug: user.tenant_slug,
                    name: user.tenant_name,
                    subscription_plan: user.subscription_plan
                }
            }
        });

        return enableCORS(response);
    } catch (error) {
        console.error('Login error:', error);
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
