import {provisionInitialAdmin} from './admin-bootstrap';
import {database} from '@/db/raw';
import {digest} from './password';
export const COOKIE='__Host-sekokan_admin';
export async function configured(){await provisionInitialAdmin();return !!await database().prepare('SELECT id FROM admins LIMIT 1').first();}
export async function authenticated(cookie:string|null){const token=cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!token||!/^[a-f0-9]{64}$/.test(token))return false;const session:any=await database().prepare('SELECT expires_at FROM sessions WHERE token_hash = ?').bind(await digest(token)).first();return !!session&&session.expires_at>new Date().toISOString();}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');return origin==='https://sekokan-daitoku-admin.nogunogu884.chatgpt.site';}
export const privateHeaders={'Cache-Control':'no-store'};
