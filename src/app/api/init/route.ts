import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { migratePostgres } from '@/lib/migrate-postgres';
import { enableCORS, handleCORS, handleCORSForOptions } from '@/lib/middleware';

export async function POST(request: NextRequest) {
    // Handle CORS preflight
    const corsResponse = await handleCORS(request);
    if (corsResponse) return corsResponse;

    try {
        // Initialize database (creates SQLite or connects to Postgres)
        const db = getDatabase();

        // If using Postgres, run migrations once
        if (process.env.DATABASE_URL) {
            await migratePostgres();
        }

        const response = NextResponse.json({
            message: 'Database initialized successfully',
            status: 'ok'
        });
        return enableCORS(response);
    } catch (error) {
        console.error('Database initialization error:', error);
        const response = NextResponse.json(
            { error: 'Database initialization failed' },
            { status: 500 }
        );
        return enableCORS(response);
    }
}

export function OPTIONS(request: NextRequest) {
    return handleCORSForOptions(request);
}

