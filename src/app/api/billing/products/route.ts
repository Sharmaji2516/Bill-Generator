import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSessionFromRequest } from '@/lib/auth/security';
import {
  BillingCollectionNotReadyError,
  deleteProduct,
  listProducts,
  saveProduct,
} from '@/lib/firebase/billingStore';
import { productSchema } from '@/lib/billing/validation';
import { BusinessId } from '@/types';

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const businessId = (request.nextUrl.searchParams.get('businessId') || 'chittortech') as BusinessId;
    const products = await listProducts(businessId);
    return NextResponse.json({ products });
  } catch (err) {
    console.error('[GET /api/billing/products]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load catalog items.' },
      { status: 500 }
    );
  }
}

async function handleSaveProduct(request: NextRequest) {
  const session = await getAuthenticatedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid product/service details.' },
        { status: 400 }
      );
    }

    const product = await saveProduct(parsed.data, session.email);
    return NextResponse.json({ product, message: 'Catalog item saved successfully.' });
  } catch (err) {
    if (err instanceof BillingCollectionNotReadyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 412 });
    }
    console.error('[SAVE /api/billing/products]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save catalog item.' },
      { status: 500 }
    );
  }
}

export const POST = handleSaveProduct;
export const PUT = handleSaveProduct;

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
      return NextResponse.json({ error: 'Product id and businessId are required.' }, { status: 400 });
    }

    await deleteProduct(id, businessId, session.email, reason);
    return NextResponse.json({ success: true, message: 'Catalog item removed.' });
  } catch (err) {
    if (err instanceof BillingCollectionNotReadyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 412 });
    }
    console.error('[DELETE /api/billing/products]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete catalog item.' },
      { status: 500 }
    );
  }
}

