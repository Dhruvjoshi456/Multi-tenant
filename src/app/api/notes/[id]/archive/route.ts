import { NextRequest, NextResponse } from 'next/server';
import { withAuth, enableCORS, handleCORS, handleCORSForOptions, AuthenticatedRequest } from '@/lib/middleware';
import { getDatabase } from '@/lib/database';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return withAuth(request, async (authenticatedRequest: AuthenticatedRequest) => {
        try {
            const { id } = await params;
            const { archived = true } = await request.json();

            const db = getDatabase();

            // Check if note exists and belongs to tenant
            const noteStmt = db.prepare(`
                SELECT * FROM notes 
                WHERE id = ? AND tenant_id = ?
            `);
            const note = noteStmt.get(id, authenticatedRequest.user.tenant_id);

            if (!note) {
                const response = NextResponse.json(
                    { error: 'Note not found' },
                    { status: 404 }
                );
                return enableCORS(response);
            }

            // Update archive status
            const updateStmt = db.prepare(`
                UPDATE notes 
                SET is_archived = ?, updated_at = datetime('now')
                WHERE id = ? AND tenant_id = ?
            `);
            updateStmt.run(archived ? 1 : 0, id, authenticatedRequest.user.tenant_id);

            const response = NextResponse.json({
                message: `Note ${archived ? 'archived' : 'unarchived'} successfully`,
                archived
            });

            return enableCORS(response);

        } catch (error) {
            console.error('Archive note error:', error);
            const response = NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            );
            return enableCORS(response);
        }
    });
}

export function OPTIONS(request: NextRequest) {
    return handleCORSForOptions(request);
}
