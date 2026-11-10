import { proxyAppsScript } from '@/lib/apps-script-proxy';

export const dynamic = 'force-dynamic';

export async function GET() {
    return proxyAppsScript({ action: 'getRecords' });
}