import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSessionFromRequest } from '@/lib/auth/security';
import { checkBillingCollectionStatus, BILLING_COLLECTION } from '@/lib/firebase/billingStore';

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = await checkBillingCollectionStatus();
  return NextResponse.json({
    collection: BILLING_COLLECTION,
    projectId: process.env.FIREBASE_PROJECT_ID || 'chittor-tech',
    ...status,
  });
}

