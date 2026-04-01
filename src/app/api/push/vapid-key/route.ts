import { NextResponse } from 'next/server';

export async function GET() {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!vapidPublicKey) {
        console.error('[VAPID Key API] VAPID public key is not configured in environment variables.');
        return NextResponse.json(
            { error: 'VAPID public key not configured' },
            { status: 500 }
        );
    }

    return NextResponse.json({ publicKey: vapidPublicKey });
}
