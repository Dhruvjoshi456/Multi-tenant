import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, User } from './auth';

export interface AuthenticatedRequest extends NextRequest {
    user: User;
}

export async function withAuth(
    request: NextRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
    try {
        const user = await getCurrentUser(request);

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const authenticatedRequest = request as AuthenticatedRequest;
        authenticatedRequest.user = user;

        return await handler(authenticatedRequest);
    } catch (error) {
        console.error('Auth middleware error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function withRole(
    request: NextRequest,
    allowedRoles: ('admin' | 'member')[],
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
    return withAuth(request, async (authenticatedRequest) => {
        if (!allowedRoles.includes(authenticatedRequest.user.role)) {
            return NextResponse.json(
                { error: 'Forbidden - Insufficient permissions' },
                { status: 403 }
            );
        }

        return await handler(authenticatedRequest);
    });
}

export async function withAdmin(
    request: NextRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
    return withRole(request, ['admin'], handler);
}

export function enableCORS(response: NextResponse): NextResponse {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
}

export async function handleCORS(request: NextRequest): Promise<NextResponse | null> {
    if (request.method === 'OPTIONS') {
        return enableCORS(new NextResponse(null, { status: 200 }));
    }
    return null;
}

export function handleCORSForOptions(request: NextRequest): NextResponse {
    return enableCORS(new NextResponse(null, { status: 200 }));
}

