import { NextRequest, NextResponse } from 'next/server';
import { withAuth, enableCORS, handleCORS, AuthenticatedRequest } from '@/lib/middleware';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
    return withAuth(request, async (authenticatedRequest: AuthenticatedRequest) => {
        try {
            const { searchParams } = new URL(request.url);
            const query = searchParams.get('q') || '';
            const category = searchParams.get('category') || '';
            const tags = searchParams.get('tags') || '';
            const archived = searchParams.get('archived') || 'false';

            if (!query.trim()) {
                const response = NextResponse.json(
                    { error: 'Search query is required' },
                    { status: 400 }
                );
                return enableCORS(response);
            }

            const db = getDatabase();

            let whereClause = 'WHERE n.tenant_id = ? AND (n.title LIKE ? OR n.content LIKE ?)';
            const params = [
                authenticatedRequest.user.tenant_id,
                `%${query}%`,
                `%${query}%`
            ];

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

            const searchStmt = db.prepare(`
                SELECT n.*, u.email as created_by_email
                FROM notes n
                JOIN users u ON n.created_by = u.id
                ${whereClause}
                ORDER BY 
                    CASE 
                        WHEN n.title LIKE ? THEN 1
                        WHEN n.content LIKE ? THEN 2
                        ELSE 3
                    END,
                    n.updated_at DESC
            `);

            // Add title and content priority search
            params.push(`%${query}%`, `%${query}%`);

            const results = searchStmt.all(...params);

            // Parse JSON fields
            const processedResults = results.map(note => ({
                ...note,
                tags: note.tags ? JSON.parse(note.tags) : [],
                shared_with: note.shared_with ? JSON.parse(note.shared_with) : []
            }));

            const response = NextResponse.json({
                query,
                results: processedResults,
                total: processedResults.length
            });

            return enableCORS(response);

        } catch (error) {
            console.error('Search notes error:', error);
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
