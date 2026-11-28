import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSessionFromRequest } from '@/lib/auth/security';
import {
  BillingCollectionNotReadyError,
  listBusinessProfiles,
  saveBusinessProfile,
} from '@/lib/firebase/billingStore';
import { businessProfileSchema } from '@/lib/billing/validation';
import { BusinessProfile } from '@/types';

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const businesses = await listBusinessProfiles();
    return NextResponse.json({ businesses });
  } catch (err) {
    console.error('[GET /api/billing/businesses]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load business profiles.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await getAuthenticatedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = businessProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid business configuration.' },
        { status: 400 }
      );
    }

    const saved = await saveBusinessProfile(parsed.data as BusinessProfile, session.email);
    return NextResponse.json({ business: saved, message: 'Business profile saved to billing_details.' });
  } catch (err) {
    if (err instanceof BillingCollectionNotReadyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 412 });
    }
    console.error('[PUT /api/billing/businesses]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update business profile.' },
      { status: 500 }
    );
  }
}

