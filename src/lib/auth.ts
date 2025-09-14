import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDatabase } from './database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface User {
    id: number;
    email: string;
    role: 'admin' | 'member';
    tenant_id: number;
    tenant_slug: string;
    tenant_name: string;
    subscription_plan: 'free' | 'pro';
}

export interface JWTPayload {
    userId: number;
    email: string;
    role: 'admin' | 'member';
    tenantId: number;
    tenantSlug: string;
}

export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
        return null;
    }
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
    const db = getDatabase();

    const userStmt = db.prepare(`
    SELECT u.*, t.slug as tenant_slug, t.name as tenant_name, t.subscription_plan
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.email = ?
  `);
    const user = userStmt.get(email);

    if (!user) {
        return null;
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
        return null;
    }

    return {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
        tenant_slug: user.tenant_slug,
        tenant_name: user.tenant_name,
        subscription_plan: user.subscription_plan
    };
}

export async function getUserById(userId: number): Promise<User | null> {
    const db = getDatabase();

    const userStmt = db.prepare(`
    SELECT u.*, t.slug as tenant_slug, t.name as tenant_name, t.subscription_plan
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.id = ?
  `);
    const user = userStmt.get(userId);

    if (!user) {
        return null;
    }

    return {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
        tenant_slug: user.tenant_slug,
        tenant_name: user.tenant_name,
        subscription_plan: user.subscription_plan
    };
}

export function extractTokenFromRequest(request: Request): string | null {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
}

export async function getCurrentUser(request: Request): Promise<User | null> {
    const token = extractTokenFromRequest(request);
    if (!token) {
        return null;
    }

    const payload = verifyToken(token);
    if (!payload) {
        return null;
    }

    return await getUserById(payload.userId);
}
