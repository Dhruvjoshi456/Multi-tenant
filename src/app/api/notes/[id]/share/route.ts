import { NextRequest, NextResponse } from 'next/server';
import { withAuth, enableCORS, handleCORS, AuthenticatedRequest } from '@/lib/middleware';
import { getDatabase } from '@/lib/database';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return withAuth(request, async (authenticatedRequest: AuthenticatedRequest) => {
        try {
            const { id } = await params;
            const { userIds, isShared } = await request.json();

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

            // Update sharing settings
            const updateStmt = db.prepare(`
                UPDATE notes 
                SET is_shared = ?, shared_with = ?, updated_at = datetime('now')
                WHERE id = ? AND tenant_id = ?
            `);
            updateStmt.run(
                isShared ? 1 : 0,
                JSON.stringify(userIds || []),
                id,
                authenticatedRequest.user.tenant_id
            );

            const response = NextResponse.json({
                message: 'Note sharing updated successfully',
                isShared,
                sharedWith: userIds || []
            });

            return enableCORS(response);

        } catch (error) {
            console.error('Update note sharing error:', error);
            const response = NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            );
            return enableCORS(response);
        }
    });
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return withAuth(request, async (authenticatedRequest: AuthenticatedRequest) => {
        try {
            const { id } = await params;

            const db = getDatabase();

            // Get note sharing info
            const noteStmt = db.prepare(`
                SELECT n.*, u.email as created_by_email
                FROM notes n
                JOIN users u ON n.created_by = u.id
                WHERE n.id = ? AND n.tenant_id = ?
            `);
            const note = noteStmt.get(id, authenticatedRequest.user.tenant_id);

            if (!note) {
                const response = NextResponse.json(
                    { error: 'Note not found' },
                    { status: 404 }
                );
                return enableCORS(response);
            }

            // Get shared users info
            const sharedWith = note.shared_with ? JSON.parse(note.shared_with) : [];
            let sharedUsers = [];

            if (sharedWith.length > 0) {
                const placeholders = sharedWith.map(() => '?').join(',');
                const usersStmt = db.prepare(`
                    SELECT id, email, first_name, last_name
                    FROM users 
                    WHERE id IN (${placeholders})
                `);
                sharedUsers = usersStmt.all(...sharedWith);
            }

            const response = NextResponse.json({
                note: {
                    ...note,
                    tags: note.tags ? JSON.parse(note.tags) : [],
                    shared_with: sharedWith,
                    shared_users: sharedUsers
                }
            });

            return enableCORS(response);

        } catch (error) {
            console.error('Get note sharing error:', error);
            const response = NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            );
            return enableCORS(response);
        }
    });
}

export async function OPTIONS(request: NextRequest) {
    return handleCORS(request);
}
