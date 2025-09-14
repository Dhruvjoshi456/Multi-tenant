import { NextRequest, NextResponse } from 'next/server';
import { withAuth, enableCORS, handleCORS, AuthenticatedRequest } from '@/lib/middleware';
import { getDatabase } from '@/lib/database';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return withAuth(request, async (authenticatedRequest: AuthenticatedRequest) => {
        try {
            const { id } = await params;
            const formData = await request.formData();
            const file = formData.get('file') as File;

            if (!file) {
                const response = NextResponse.json(
                    { error: 'No file provided' },
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

            // Create uploads directory if it doesn't exist
            const uploadsDir = join(process.cwd(), 'uploads', 'notes', id);
            await mkdir(uploadsDir, { recursive: true });

            // Generate unique filename
            const fileExtension = file.name.split('.').pop();
            const filename = `${uuidv4()}.${fileExtension}`;
            const filePath = join(uploadsDir, filename);

            // Save file
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            await writeFile(filePath, buffer);

            // Save attachment record
            const insertAttachmentStmt = db.prepare(`
                INSERT INTO note_attachments (note_id, filename, original_name, file_type, file_size, file_path, uploaded_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            const result = insertAttachmentStmt.run(
                id,
                filename,
                file.name,
                file.type,
                file.size,
                filePath,
                authenticatedRequest.user.id
            );

            const attachmentId = result.lastInsertRowid;

            const response = NextResponse.json({
                message: 'File uploaded successfully',
                attachment: {
                    id: attachmentId,
                    filename,
                    original_name: file.name,
                    file_type: file.type,
                    file_size: file.size,
                    uploaded_at: new Date().toISOString()
                }
            }, { status: 201 });

            return enableCORS(response);

        } catch (error) {
            console.error('Upload attachment error:', error);
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

            // Get attachments
            const attachmentsStmt = db.prepare(`
                SELECT na.*, u.email as uploaded_by_email
                FROM note_attachments na
                JOIN users u ON na.uploaded_by = u.id
                WHERE na.note_id = ?
                ORDER BY na.created_at DESC
            `);
            const attachments = attachmentsStmt.all(id);

            const response = NextResponse.json({ attachments });
            return enableCORS(response);

        } catch (error) {
            console.error('Get attachments error:', error);
            const response = NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            );
            return enableCORS(response);
        }
    });
}

export async function OPTIONS(request: NextRequest) {
    return handleCORSForOptions(request);
}
