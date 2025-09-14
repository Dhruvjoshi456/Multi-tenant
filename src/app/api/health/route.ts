import { NextRequest, NextResponse } from 'next/server';
import { enableCORS, handleCORS } from '@/lib/middleware';

export async function GET(request: NextRequest) {
    // Handle CORS preflight
    const corsResponse = await handleCORS(request);
    if (corsResponse) return corsResponse;

    const response = NextResponse.json({ status: 'ok' });
    return enableCORS(response);
}

export async function OPTIONS(request: NextRequest) {
    return handleCORS(request);
}

