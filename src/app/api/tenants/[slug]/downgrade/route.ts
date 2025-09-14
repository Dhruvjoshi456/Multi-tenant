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
                    { error: 'Forbidden - Cannot downgrade different tenant' },
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

            // Check if already on free plan
            if (tenant.subscription_plan === 'free') {
                const response = NextResponse.json({
                    message: 'Tenant is already on Free plan',
                    tenant: {
                        id: tenant.id,
                        name: tenant.name,
                        slug: tenant.slug,
                        subscription_plan: 'free'
                    }
                }, { status: 200 });
                return enableCORS(response);
            }

            // Downgrade to free
            const updateStmt = db.prepare(`
        UPDATE tenants 
        SET subscription_plan = 'free'
        WHERE slug = ? AND id = ?
      `);
            updateStmt.run(slug, authenticatedRequest.user.tenant_id);

            const response = NextResponse.json({
                message: 'Tenant downgraded to Free plan successfully',
                tenant: {
                    id: tenant.id,
                    name: tenant.name,
                    slug: tenant.slug,
                    subscription_plan: 'free'
                }
            });

            return enableCORS(response);
        } catch (error) {
            console.error('Downgrade tenant error:', error);
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
