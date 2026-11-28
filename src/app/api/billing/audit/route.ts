import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSessionFromRequest } from '@/lib/auth/security';
import { listAuditLogs } from '@/lib/firebase/billingStore';
import { BusinessId } from '@/types';

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const businessId = (request.nextUrl.searchParams.get('businessId') || 'chittortech') as BusinessId;
    const limitParam = Number(request.nextUrl.searchParams.get('limit') || '100');
    const limitCount = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 300) : 100;
    const logs = await listAuditLogs(businessId, limitCount);
    return NextResponse.json({ logs });
  } catch (err) {
    console.error('[GET /api/billing/audit]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load audit trail.' },
      { status: 500 }
    );
  }
}

