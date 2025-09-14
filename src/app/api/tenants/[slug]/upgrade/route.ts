import { NextRequest, NextResponse } from 'next/server';
import { withAdmin, enableCORS, handleCORS, AuthenticatedRequest } from '@/lib/middleware';
import { getDatabase } from '@/lib/database';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    return withAdmin(request, async (authenticatedRequest: AuthenticatedRequest) => {
        try {
            const db = getDatabase();
            const { slug } = await params;

            // Verify that the tenant slug matches the user's tenant
            if (authenticatedRequest.user.tenant_slug !== slug) {
                const response = NextResponse.json(
                    { error: 'Forbidden - Cannot upgrade different tenant' },
                    { status: 403 }
                );
                return enableCORS(response);
            }

            // Check if tenant exists
            const tenantStmt = db.prepare(`
        SELECT * FROM tenants WHERE slug = ? AND id = ?
      `);
            const tenant = tenantStmt.get(slug, authenticatedRequest.user.tenant_id);

            if (!tenant) {
                const response = NextResponse.json(
                    { error: 'Tenant not found' },
                    { status: 404 }
                );
                return enableCORS(response);
            }

            // Check if already on pro plan
            if (tenant.subscription_plan === 'pro') {
                const response = NextResponse.json({
                    message: 'Tenant is already on Pro plan',
                    tenant: {
                        id: tenant.id,
                        name: tenant.name,
                        slug: tenant.slug,
                        subscription_plan: 'pro'
                    }
                }, { status: 200 });
                return enableCORS(response);
            }

            // Upgrade to pro
            const updateStmt = db.prepare(`
        UPDATE tenants 
        SET subscription_plan = 'pro'
        WHERE slug = ? AND id = ?
      `);
            updateStmt.run(slug, authenticatedRequest.user.tenant_id);

            const response = NextResponse.json({
                message: 'Tenant upgraded to Pro plan successfully',
                tenant: {
                    id: tenant.id,
                    name: tenant.name,
                    slug: tenant.slug,
                    subscription_plan: 'pro'
                }
            });

            return enableCORS(response);
        } catch (error) {
            console.error('Upgrade tenant error:', error);
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
