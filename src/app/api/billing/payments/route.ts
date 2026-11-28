import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSessionFromRequest } from '@/lib/auth/security';
import {
  BillingCollectionNotReadyError,
  deletePayment,
  listPayments,
  recordPayment,
} from '@/lib/firebase/billingStore';
import { paymentRecordSchema } from '@/lib/billing/validation';
import { BusinessId } from '@/types';

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const businessId = (request.nextUrl.searchParams.get('businessId') || 'chittortech') as BusinessId;
    const payments = await listPayments(businessId);
    return NextResponse.json({ payments });
  } catch (err) {
    console.error('[GET /api/billing/payments]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load payments.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = paymentRecordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid payment payload.' },
        { status: 400 }
      );
    }

    const result = await recordPayment(parsed.data, session.email);
    return NextResponse.json({
      payment: result.payment,
      invoice: result.invoice,
      message: `Payment recorded for ${result.invoice.invoiceNumber}.`,
    });
  } catch (err) {
    if (err instanceof BillingCollectionNotReadyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 412 });
    }
    console.error('[POST /api/billing/payments]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to record payment.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getAuthenticatedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const id = request.nextUrl.searchParams.get('id');
    const businessId = (request.nextUrl.searchParams.get('businessId') || '') as BusinessId;
    const reason = request.nextUrl.searchParams.get('reason') || undefined;

    if (!id || !businessId) {
      return NextResponse.json({ error: 'Payment id and businessId are required.' }, { status: 400 });
    }

    await deletePayment(id, businessId, session.email, reason);
    return NextResponse.json({ success: true, message: 'Payment reversed & invoice recalculated.' });
  } catch (err) {
    if (err instanceof BillingCollectionNotReadyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 412 });
    }
    console.error('[DELETE /api/billing/payments]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to reverse payment.' },
      { status: 500 }
    );
  }
}

