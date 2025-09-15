import { NextRequest, NextResponse } from 'next/server';
import { withAdmin, enableCORS, handleCORS, handleCORSForOptions, AuthenticatedRequest } from '@/lib/middleware';
import { getDatabase } from '@/lib/database';
import { sendInvitationEmail } from '@/lib/email';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    return withAdmin(request, async (authenticatedRequest: AuthenticatedRequest) => {
        try {
            const { email, firstName, lastName, role = 'member' } = await request.json();
            const { slug } = await params;

            // Validate input
            if (!email || !firstName || !lastName) {
                const response = NextResponse.json(
                    { error: 'Email, first name, and last name are required' },
                    { status: 400 }
                );
                return enableCORS(response);
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                const response = NextResponse.json(
                    { error: 'Invalid email format' },
                    { status: 400 }
                );
                return enableCORS(response);
            }

            // Verify that the tenant slug matches the user's tenant
            if (authenticatedRequest.user.tenant_slug !== slug) {
                const response = NextResponse.json(
                    { error: 'Forbidden - Cannot invite to different tenant' },
                    { status: 403 }
                );
                return enableCORS(response);
            }

            const db = getDatabase();

            // Check if user already exists in this tenant
            const existingUserStmt = db.prepare(`
                SELECT u.* FROM users u 
                WHERE u.email = ? AND u.tenant_id = ?
            `);
            const existingUser = await existingUserStmt.get(email, authenticatedRequest.user.tenant_id);

            if (existingUser) {
                const response = NextResponse.json(
                    { error: 'User is already a member of this organization' },
                    { status: 409 }
                );
                return enableCORS(response);
            }

            // Check if there's already a pending invitation
            const existingInvitationStmt = db.prepare(`
                SELECT * FROM user_invitations 
                WHERE email = ? AND tenant_id = ? AND accepted_at IS NULL
            `);
            const existingInvitation = await existingInvitationStmt.get(email, authenticatedRequest.user.tenant_id);

            if (existingInvitation) {
                const response = NextResponse.json(
                    { error: 'Invitation already sent to this email address' },
                    { status: 409 }
                );
                return enableCORS(response);
            }

            // Generate invitation token
            const invitationToken = jwt.sign(
                {
                    email,
                    firstName,
                    lastName,
                    role,
                    tenantId: authenticatedRequest.user.tenant_id,
                    tenantSlug: slug,
                    type: 'invitation'
                },
                JWT_SECRET,
                { expiresIn: '7d' } // Invitation valid for 7 days
            );

            // Store invitation
            const insertInvitationStmt = db.prepare(`
                INSERT INTO user_invitations (email, first_name, last_name, role, tenant_id, token, expires_at, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `);
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            await insertInvitationStmt.run(
                email,
                firstName,
                lastName,
                role,
                authenticatedRequest.user.tenant_id,
                invitationToken,
                expiresAt,
                authenticatedRequest.user.id
            );

            // Get tenant name for email
            const tenantStmt = db.prepare('SELECT name FROM tenants WHERE id = ?');
            const tenant = await tenantStmt.get(authenticatedRequest.user.tenant_id) as { name: string } | null;

            // Create invitation link
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const invitationLink = `${baseUrl}/accept-invitation?token=${invitationToken}`;

            // Send invitation email
            const emailSent = await sendInvitationEmail({
                to: email,
                firstName,
                lastName,
                companyName: tenant?.name || 'Your Organization',
                invitationLink,
                invitedBy: `${authenticatedRequest.user.firstName} ${authenticatedRequest.user.last_name}`
            });

            const response = NextResponse.json({
                message: emailSent
                    ? 'Invitation sent successfully via email'
                    : 'Invitation created but email failed to send',
                invitation: {
                    email,
                    firstName,
                    lastName,
                    role,
                    expiresAt,
                    invitationLink: emailSent ? undefined : invitationLink // Only show link if email failed
                },
                emailSent
            }, { status: 201 });

            return enableCORS(response);

        } catch (error) {
            console.error('Invite user error:', error);
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
    { params }: { params: Promise<{ slug: string }> }
) {
    return withAdmin(request, async (authenticatedRequest: AuthenticatedRequest) => {
        try {
            const { slug } = await params;

            // Verify that the tenant slug matches the user's tenant
            if (authenticatedRequest.user.tenant_slug !== slug) {
                const response = NextResponse.json(
                    { error: 'Forbidden - Cannot view different tenant invitations' },
                    { status: 403 }
                );
                return enableCORS(response);
            }

            const db = getDatabase();

            // Get pending invitations
            const invitationsStmt = db.prepare(`
                SELECT ui.*, u.email as invited_by_email
                FROM user_invitations ui
                JOIN users u ON ui.created_by = u.id
                WHERE ui.tenant_id = ? AND ui.accepted_at IS NULL
                ORDER BY ui.created_at DESC
            `);
            const invitations = await invitationsStmt.all(authenticatedRequest.user.tenant_id);

            const response = NextResponse.json({ invitations });
            return enableCORS(response);

        } catch (error) {
            console.error('Get invitations error:', error);
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
