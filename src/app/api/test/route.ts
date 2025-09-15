import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { enableCORS, handleCORS, handleCORSForOptions } from '@/lib/middleware';

export async function GET(request: NextRequest) {
    // Handle CORS preflight
    const corsResponse = await handleCORS(request);
    if (corsResponse) return corsResponse;

    try {
        const db = getDatabase();

        // Test database connection and get some data
        const tenantsStmt = db.prepare('SELECT * FROM tenants');
        const usersStmt = db.prepare('SELECT * FROM users');
        const notesStmt = db.prepare('SELECT * FROM notes');

        const tenants = await tenantsStmt.all();
        const users = await usersStmt.all();
        const notes = await notesStmt.all();

        const response = NextResponse.json({
            status: 'ok',
            database: {
                tenants: tenants.length,
                users: users.length,
                notes: notes.length
            },
            data: {
                tenants,
                users: users.map(u => ({ id: u.id, email: u.email, role: u.role, tenant_id: u.tenant_id })),
                notes
            }
        });
        return enableCORS(response);
    } catch (error) {
        console.error('Test endpoint error:', error);
        const errorMessage = (error instanceof Error) ? error.message : String(error);
        const response = NextResponse.json(
            { error: 'Database test failed', details: errorMessage },
            { status: 500 }
        );
        return enableCORS(response);
    }
}

export function OPTIONS(request: NextRequest) {
    return handleCORSForOptions(request);
}



