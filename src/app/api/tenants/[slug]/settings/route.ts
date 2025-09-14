import { NextRequest, NextResponse } from 'next/server';
import { withAdmin, enableCORS, handleCORS, AuthenticatedRequest } from '@/lib/middleware';
import { getDatabase } from '@/lib/database';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    return withAdmin(request, async (authenticatedRequest: AuthenticatedRequest) => {
        try {
            const { slug } = await params;

            // Verify that the tenant slug matches the user's tenant
            if (authenticatedRequest.user.tenant_slug !== slug) {
                const response = NextResponse.json(
                    { error: 'Forbidden - Cannot access different tenant settings' },
                    { status: 403 }
                );
                return enableCORS(response);
            }

            const db = getDatabase();

            // Get tenant settings
            const tenantStmt = db.prepare(`
                SELECT id, name, slug, subscription_plan, theme_color, logo, created_at
                FROM tenants WHERE slug = ?
            `);
            const tenant = tenantStmt.get(slug);

            if (!tenant) {
                const response = NextResponse.json(
                    { error: 'Tenant not found' },
                    { status: 404 }
                );
                return enableCORS(response);
            }

            const response = NextResponse.json({ tenant });
            return enableCORS(response);

        } catch (error) {
            console.error('Get tenant settings error:', error);
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
    { params }: { params: Promise<{ slug: string }> }
) {
    return withAdmin(request, async (authenticatedRequest: AuthenticatedRequest) => {
        try {
            const { slug } = await params;
            const { name, themeColor, logo } = await request.json();

            // Verify that the tenant slug matches the user's tenant
            if (authenticatedRequest.user.tenant_slug !== slug) {
                const response = NextResponse.json(
                    { error: 'Forbidden - Cannot update different tenant settings' },
                    { status: 403 }
                );
                return enableCORS(response);
            }

            const db = getDatabase();

            // Check if tenant exists
            const existingTenantStmt = db.prepare('SELECT * FROM tenants WHERE slug = ?');
            const existingTenant = existingTenantStmt.get(slug);

            if (!existingTenant) {
                const response = NextResponse.json(
                    { error: 'Tenant not found' },
                    { status: 404 }
                );
                return enableCORS(response);
            }

            // Update tenant settings
            const updateStmt = db.prepare(`
                UPDATE tenants 
                SET name = COALESCE(?, name),
                    theme_color = COALESCE(?, theme_color),
                    logo = COALESCE(?, logo),
                    updated_at = datetime('now')
                WHERE slug = ?
            `);
            updateStmt.run(name, themeColor, logo, slug);

            // Get updated tenant
            const updatedTenantStmt = db.prepare(`
                SELECT id, name, slug, subscription_plan, theme_color, logo, created_at, updated_at
                FROM tenants WHERE slug = ?
            `);
            const updatedTenant = updatedTenantStmt.get(slug);

            const response = NextResponse.json({
                message: 'Tenant settings updated successfully',
                tenant: updatedTenant
            });

            return enableCORS(response);

        } catch (error) {
            console.error('Update tenant settings error:', error);
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
