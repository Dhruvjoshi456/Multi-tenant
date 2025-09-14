import { NextRequest, NextResponse } from 'next/server';
import { withAuth, enableCORS, handleCORS, AuthenticatedRequest } from '@/lib/middleware';
import { getDatabase } from '@/lib/database';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return withAuth(request, async (authenticatedRequest: AuthenticatedRequest) => {
        try {
            const { id } = await params;

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

            // Get note versions
            const versionsStmt = db.prepare(`
                SELECT nv.*, u.email as created_by_email
                FROM note_versions nv
                JOIN users u ON nv.created_by = u.id
                WHERE nv.note_id = ?
                ORDER BY nv.version_number DESC
            `);
            const versions = versionsStmt.all(id);

            const response = NextResponse.json({ versions });
            return enableCORS(response);

        } catch (error) {
            console.error('Get note versions error:', error);
            const response = NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            );
            return enableCORS(response);
        }
    });
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return withAuth(request, async (authenticatedRequest: AuthenticatedRequest) => {
        try {
            const { id } = await params;
            const { title, content } = await request.json();

            if (!title || !content) {
                const response = NextResponse.json(
                    { error: 'Title and content are required' },
                    { status: 400 }
                );
                return enableCORS(response);
            }

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

            // Get next version number
            const maxVersionStmt = db.prepare(`
                SELECT MAX(version_number) as max_version
                FROM note_versions 
                WHERE note_id = ?
            `);
            const maxVersion = maxVersionStmt.get(id);
            const nextVersion = (maxVersion.max_version || 0) + 1;

            // Create version
            const insertVersionStmt = db.prepare(`
                INSERT INTO note_versions (note_id, title, content, version_number, created_by)
                VALUES (?, ?, ?, ?, ?)
            `);
            insertVersionStmt.run(id, title, content, nextVersion, authenticatedRequest.user.id);

            // Update note
            const updateNoteStmt = db.prepare(`
                UPDATE notes 
                SET title = ?, content = ?, updated_at = datetime('now')
                WHERE id = ? AND tenant_id = ?
            `);
            updateNoteStmt.run(title, content, id, authenticatedRequest.user.tenant_id);

            const response = NextResponse.json({
                message: 'Note version created successfully',
                version: nextVersion
            }, { status: 201 });

            return enableCORS(response);

        } catch (error) {
            console.error('Create note version error:', error);
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
