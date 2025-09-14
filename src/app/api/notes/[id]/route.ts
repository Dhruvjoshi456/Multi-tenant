import { NextRequest, NextResponse } from 'next/server';
import { withAuth, enableCORS, handleCORS, AuthenticatedRequest } from '@/lib/middleware';
import { getDatabase } from '@/lib/database';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return withAuth(request, async (authenticatedRequest: AuthenticatedRequest) => {
        try {
            const db = getDatabase();
            const { id } = await params;
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

            const response = NextResponse.json({ note });
            return enableCORS(response);
        } catch (error) {
            console.error('Get note error:', error);
            const response = NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            );
            return enableCORS(response);
        }
    });
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return withAuth(request, async (authenticatedRequest: AuthenticatedRequest) => {
        try {
            const { title, content } = await request.json();
            const { id } = await params;

            if (!title || !content) {
                const response = NextResponse.json(
                    { error: 'Title and content are required' },
                    { status: 400 }
                );
                return enableCORS(response);
            }

            const db = getDatabase();

            // Check if note exists and belongs to tenant
            const existingNoteStmt = db.prepare(`
        SELECT * FROM notes WHERE id = ? AND tenant_id = ?
      `);
            const existingNote = existingNoteStmt.get(id, authenticatedRequest.user.tenant_id);

            if (!existingNote) {
                const response = NextResponse.json(
                    { error: 'Note not found' },
                    { status: 404 }
                );
                return enableCORS(response);
            }

            const updateStmt = db.prepare(`
        UPDATE notes 
        SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND tenant_id = ?
      `);
            updateStmt.run(title, content, id, authenticatedRequest.user.tenant_id);

            const updatedNoteStmt = db.prepare(`
        SELECT n.*, u.email as created_by_email
        FROM notes n
        JOIN users u ON n.created_by = u.id
        WHERE n.id = ?
      `);
            const updatedNote = updatedNoteStmt.get(id);

            const response = NextResponse.json({ note: updatedNote });
            return enableCORS(response);
        } catch (error) {
            console.error('Update note error:', error);
            const response = NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            );
            return enableCORS(response);
        }
    });
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return withAuth(request, async (authenticatedRequest: AuthenticatedRequest) => {
        try {
            const db = getDatabase();
            const { id } = await params;

            // Check if note exists and belongs to tenant
            const existingNoteStmt = db.prepare(`
        SELECT * FROM notes WHERE id = ? AND tenant_id = ?
      `);
            const existingNote = existingNoteStmt.get(id, authenticatedRequest.user.tenant_id);

            if (!existingNote) {
                const response = NextResponse.json(
                    { error: 'Note not found' },
                    { status: 404 }
                );
                return enableCORS(response);
            }

            const deleteStmt = db.prepare(`
        DELETE FROM notes WHERE id = ? AND tenant_id = ?
      `);
            deleteStmt.run(id, authenticatedRequest.user.tenant_id);

            const response = NextResponse.json({ message: 'Note deleted successfully' });
            return enableCORS(response);
        } catch (error) {
            console.error('Delete note error:', error);
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
