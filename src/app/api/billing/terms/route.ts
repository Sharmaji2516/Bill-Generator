import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedSessionFromRequest } from '@/lib/auth/security';
import {
  BillingCollectionNotReadyError,
  getSavedTermsDocument,
  saveTermsDocument,
} from '@/lib/firebase/billingStore';
import { BusinessId } from '@/types';

const termsSaveSchema = z.object({
  businessId: z.string().min(2).max(40),
  title: z.string().min(1).max(160).optional(),
  clientName: z.string().min(1).max(160).optional(),
  effectiveDate: z.string().max(40).default(''),
  rawContent: z.string().min(1).max(50000).optional(),
  content: z.string().min(1).max(50000).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const businessId = (request.nextUrl.searchParams.get('businessId') || 'chittortech') as BusinessId;
    const terms = await getSavedTermsDocument(businessId);
    return NextResponse.json({ terms });
  } catch (err) {
    console.error('[GET /api/billing/terms]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load Terms & Conditions.' },
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
    const parsed = termsSaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid Terms document payload.' },
        { status: 400 }
      );
    }

    const saved = await saveTermsDocument(
      parsed.data.businessId,
      {
        clientName: parsed.data.title || parsed.data.clientName || 'Master Terms & Conditions',
        effectiveDate: parsed.data.effectiveDate,
        content: parsed.data.rawContent || parsed.data.content || '',
      },
      session.email
    );
    return NextResponse.json({ terms: saved, message: 'Terms & Conditions saved.' });
  } catch (err) {
    if (err instanceof BillingCollectionNotReadyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 412 });
    }
    console.error('[PUT /api/billing/terms]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save Terms & Conditions.' },
      { status: 500 }
    );
  }
}
