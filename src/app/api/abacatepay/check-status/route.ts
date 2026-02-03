import { NextRequest, NextResponse } from 'next/server';
import { getAbacatepayBilling } from '@/lib/abacatepay';

export async function GET(req: NextRequest) {
    try {
        const billingId = req.nextUrl.searchParams.get('billingId');

        if (!billingId) {
            return NextResponse.json(
                { error: 'billingId is required' },
                { status: 400 }
            );
        }

        const billing = await getAbacatepayBilling(billingId);

        if (!billing) {
            return NextResponse.json(
                { error: 'Billing not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            billingId: billing.id,
            status: billing.status,
            amount: billing.amount,
        });

    } catch (error: any) {
        console.error('[AbacatePay Check Status] Error:', error);
        return NextResponse.json(
            { error: `Erro: ${error.message}` },
            { status: 500 }
        );
    }
}
