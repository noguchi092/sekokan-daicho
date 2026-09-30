import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {authenticated} from '@/lib/admin-auth';
import AdminApp from '@/components/admin-app';
export const dynamic='force-dynamic';
export default async function Page(){const h=await headers();if(!await authenticated(h.get('cookie')))redirect('/login');return <AdminApp/>;}
