import { NextRequest, NextResponse } from 'next/server';
import { enableCORS, handleCORS, handleCORSForOptions } from '@/lib/middleware';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
    // Handle CORS preflight
    const corsResponse = await handleCORS(request);
    if (corsResponse) return corsResponse;

    try {
        const user = await getCurrentUser(request);
        if (!user) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            return enableCORS(response);
        }

        // Normalize shape to match /api/auth/login response
        const normalized = {
            id: user.id,
            email: user.email,
            role: user.role,
            tenant: {
                id: user.tenant_id,
                slug: user.tenant_slug,
                name: user.tenant_name,
                subscription_plan: user.subscription_plan,
            },
        };
        const response = NextResponse.json({ user: normalized });
        return enableCORS(response);
    } catch (error) {
        console.error('Get current user error:', error);
        const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        return enableCORS(response);
    }
}

export function OPTIONS(request: NextRequest) {
    return handleCORSForOptions(request);
}


