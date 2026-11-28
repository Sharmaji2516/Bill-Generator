import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSessionFromRequest } from '@/lib/auth/security';
import {
  BillingCollectionNotReadyError,
  deleteCustomer,
  listCustomers,
  saveCustomer,
} from '@/lib/firebase/billingStore';
import { customerSchema } from '@/lib/billing/validation';
import { BusinessId } from '@/types';

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const businessId = (request.nextUrl.searchParams.get('businessId') || 'chittortech') as BusinessId;
    const customers = await listCustomers(businessId);
    return NextResponse.json({ customers });
  } catch (err) {
    console.error('[GET /api/billing/customers]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load customers.' },
      { status: 500 }
    );
  }
}

async function handleSaveCustomer(request: NextRequest) {
  const session = await getAuthenticatedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid customer details.' },
        { status: 400 }
      );
    }

    const customer = await saveCustomer(parsed.data, session.email);
    return NextResponse.json({ customer, message: 'Customer saved successfully.' });
  } catch (err) {
    if (err instanceof BillingCollectionNotReadyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 412 });
    }
    console.error('[SAVE /api/billing/customers]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save customer.' },
      { status: 500 }
    );
  }
}

export const POST = handleSaveCustomer;
export const PUT = handleSaveCustomer;

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
      return NextResponse.json({ error: 'Customer id and businessId are required.' }, { status: 400 });
    }

    await deleteCustomer(id, businessId, session.email, reason);
    return NextResponse.json({ success: true, message: 'Customer removed.' });
  } catch (err) {
    if (err instanceof BillingCollectionNotReadyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 412 });
    }
    console.error('[DELETE /api/billing/customers]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete customer.' },
      { status: 500 }
    );
  }
}

