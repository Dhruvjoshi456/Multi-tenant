import { NextRequest, NextResponse } from 'next/server';
import { withAuth, enableCORS, handleCORS, AuthenticatedRequest } from '@/lib/middleware';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
    return withAuth(request, async (authenticatedRequest: AuthenticatedRequest) => {
        try {
            const db = getDatabase();
            const { search, category, tags, archived } = request.nextUrl.searchParams;

            let whereClause = 'WHERE n.tenant_id = ?';
            const params = [authenticatedRequest.user.tenant_id];

            // Add search filter
            if (search) {
                whereClause += ' AND (n.title LIKE ? OR n.content LIKE ?)';
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm);
            }

            // Add category filter
            if (category) {
                whereClause += ' AND n.category = ?';
                params.push(category);
            }

            // Add tags filter
            if (tags) {
                const tagList = tags.split(',').map(tag => tag.trim());
                const tagConditions = tagList.map(() => 'n.tags LIKE ?').join(' AND ');
                whereClause += ` AND (${tagConditions})`;
                tagList.forEach(tag => params.push(`%"${tag}"%`));
            }

            // Add archived filter
            if (archived === 'true') {
                whereClause += ' AND n.is_archived = 1';
            } else if (archived === 'false') {
                whereClause += ' AND n.is_archived = 0';
            }

            const notesStmt = db.prepare(`
        SELECT n.*, u.email as created_by_email
        FROM notes n
        JOIN users u ON n.created_by = u.id
        ${whereClause}
        ORDER BY n.updated_at DESC
      `);
            const notes = notesStmt.all(...params);

            // Parse JSON fields
            const processedNotes = notes.map(note => ({
                ...note,
                tags: note.tags ? JSON.parse(note.tags) : [],
                shared_with: note.shared_with ? JSON.parse(note.shared_with) : []
            }));

            const response = NextResponse.json({ notes: processedNotes });
            return enableCORS(response);
        } catch (error) {
            console.error('Get notes error:', error);
            const response = NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            );
            return enableCORS(response);
        }
    });
}

export async function POST(request: NextRequest) {
    return withAuth(request, async (authenticatedRequest: AuthenticatedRequest) => {
        try {
            const { title, content, tags = [], category, isShared = false, sharedWith = [] } = await request.json();

            if (!title || !content) {
                const response = NextResponse.json(
                    { error: 'Title and content are required' },
                    { status: 400 }
                );
                return enableCORS(response);
            }

            const db = getDatabase();

            // Check note limit for free plan
            if (authenticatedRequest.user.subscription_plan === 'free') {
                const noteCountStmt = db.prepare(`
          SELECT COUNT(*) as count FROM notes WHERE tenant_id = ?
        `);
                const noteCount = noteCountStmt.get(authenticatedRequest.user.tenant_id);

                if (noteCount.count >= 3) {
                    const response = NextResponse.json(
                        { error: 'Note limit reached. Upgrade to Pro for unlimited notes.' },
                        { status: 403 }
                    );
                    return enableCORS(response);
                }
            }

            const insertStmt = db.prepare(`
        INSERT INTO notes (title, content, tenant_id, created_by, tags, category, is_shared, shared_with)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
            const result = insertStmt.run(
                title,
                content,
                authenticatedRequest.user.tenant_id,
                authenticatedRequest.user.id,
                JSON.stringify(tags),
                category,
                isShared ? 1 : 0,
                JSON.stringify(sharedWith)
            );

            const newNoteStmt = db.prepare(`
        SELECT n.*, u.email as created_by_email
        FROM notes n
        JOIN users u ON n.created_by = u.id
        WHERE n.id = ?
      `);
            const newNote = newNoteStmt.get(result.lastInsertRowid);

            // Parse JSON fields
            const processedNote = {
                ...newNote,
                tags: newNote.tags ? JSON.parse(newNote.tags) : [],
                shared_with: newNote.shared_with ? JSON.parse(newNote.shared_with) : []
            };

            const response = NextResponse.json({ note: processedNote }, { status: 201 });
            return enableCORS(response);
        } catch (error) {
            console.error('Create note error:', error);
            const response = NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            );
            return enableCORS(response);
        }
    });
}

export async function OPTIONS(request: NextRequest) {
    return handleCORS(request) || new NextResponse(null, { status: 200 });
}
