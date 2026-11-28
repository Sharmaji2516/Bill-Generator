import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedSessionFromRequest } from '@/lib/auth/security';
import {
  BillingCollectionNotReadyError,
  deleteInvoice,
  getNextSuggestedNumber,
  listInvoices,
  saveInvoice,
  updateInvoiceStatus,
} from '@/lib/firebase/billingStore';
import { invoiceSaveSchema } from '@/lib/billing/validation';
import { BillingDocumentType, BusinessId, InvoiceStatus } from '@/types';

const statusUpdateSchema = z.object({
  id: z.string().min(3),
  businessId: z.string().min(2).max(40),
  status: z.enum(['DRAFT', 'UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED']),
  reason: z.string().max(300).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const businessId = request.nextUrl.searchParams.get('businessId') as BusinessId | null;
    const previewDocType = request.nextUrl.searchParams.get('previewDocType') as BillingDocumentType | null;
    const issueDate = request.nextUrl.searchParams.get('issueDate') || undefined;

    if (previewDocType && businessId) {
      const next = await getNextSuggestedNumber(businessId, previewDocType, issueDate);
      return NextResponse.json({ nextNumber: next });
    }

    const invoices = await listInvoices(businessId || undefined);
    return NextResponse.json({ invoices });
  } catch (err) {
    console.error('[GET /api/billing/invoices]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load invoices.' },
      { status: 500 }
    );
  }
}

async function handleSaveInvoice(request: NextRequest) {
  const session = await getAuthenticatedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = invoiceSaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid invoice payload.' },
        { status: 400 }
      );
    }

    const invoice = await saveInvoice(
      { ...parsed.data, amountPaid: parsed.data.amountPaid ?? 0 },
      session.email
    );
    return NextResponse.json({
      invoice,
      message: `${invoice.invoiceNumber} saved to billing_details.`,
    });
  } catch (err) {
    if (err instanceof BillingCollectionNotReadyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 412 });
    }
    console.error('[SAVE /api/billing/invoices]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save invoice.' },
      { status: 500 }
    );
  }
}

export const POST = handleSaveInvoice;
export const PUT = handleSaveInvoice;

export async function PATCH(request: NextRequest) {
  const session = await getAuthenticatedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = statusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid status update payload.' },
        { status: 400 }
      );
    }

    const updated = await updateInvoiceStatus(
      parsed.data.id,
      parsed.data.businessId,
      parsed.data.status as InvoiceStatus,
      session.email,
      parsed.data.reason
    );
    return NextResponse.json({
      invoice: updated,
      message: `Status updated to ${updated.status}.`,
    });
  } catch (err) {
    if (err instanceof BillingCollectionNotReadyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 412 });
    }
    console.error('[PATCH /api/billing/invoices]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update invoice status.' },
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
    const businessId = request.nextUrl.searchParams.get('businessId') as BusinessId | null;
    const reason = request.nextUrl.searchParams.get('reason') || undefined;

    if (!id || !businessId) {
      return NextResponse.json({ error: 'Invoice id and businessId are required.' }, { status: 400 });
    }

    await deleteInvoice(id, businessId, session.email, reason);
    return NextResponse.json({ success: true, message: 'Document permanently removed.' });
  } catch (err) {
    if (err instanceof BillingCollectionNotReadyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 412 });
    }
    console.error('[DELETE /api/billing/invoices]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete invoice.' },
      { status: 500 }
    );
  }
}
