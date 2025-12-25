import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Debug endpoint para testar conexão com Supabase
export async function GET() {
    try {
        console.log('[DEBUG] Testing supabaseAdmin connection...');
        console.log('[DEBUG] SUPABASE_SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
        console.log('[DEBUG] SUPABASE_SERVICE_ROLE_KEY starts with:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20));

        // Test 1: Try to select from subscriptions table
        const { data: selectData, error: selectError } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .limit(5);

        if (selectError) {
            console.error('[DEBUG] Select error:', selectError);
            return NextResponse.json({
                success: false,
                error: 'Select failed',
                details: selectError
            }, { status: 500 });
        }

        console.log('[DEBUG] Existing subscriptions:', selectData);

        // Test 2: Try to upsert with a test user ID
        const testUserId = 'test-debug-' + Date.now();
        const { data: upsertData, error: upsertError } = await supabaseAdmin
            .from('subscriptions')
            .upsert({
                user_id: testUserId,
                stripe_customer_id: 'cus_test_debug',
                stripe_subscription_id: 'sub_test_debug',
                stripe_price_id: 'price_test_debug',
                plan_type: 'Basico',
                status: 'active',
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                billing_period: 'monthly'
            } as any, { onConflict: 'user_id' })
            .select();

        if (upsertError) {
            console.error('[DEBUG] Upsert error:', upsertError);
            return NextResponse.json({
                success: false,
                error: 'Upsert failed',
                details: upsertError,
                existingSubscriptions: selectData
            }, { status: 500 });
        }

        console.log('[DEBUG] Upsert success:', upsertData);

        // Clean up test data
        await supabaseAdmin
            .from('subscriptions')
            .delete()
            .eq('user_id', testUserId);

        return NextResponse.json({
            success: true,
            message: 'Supabase connection and upsert working correctly!',
            existingSubscriptions: selectData,
            testUpsertResult: upsertData
        });
    } catch (error) {
        console.error('[DEBUG] Unexpected error:', error);
        return NextResponse.json({
            success: false,
            error: 'Unexpected error',
            details: (error as Error).message
        }, { status: 500 });
    }
}
