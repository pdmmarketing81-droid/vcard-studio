import { NextResponse } from 'next/server';
import { currentProfile } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Just enough for the checkout page to know when the account has switched on.
 *
 * "Active" means a plan has been recorded against the profile — which only the
 * webhook does, and only after Razorpay has confirmed the money. Anything the
 * browser could set instead would be a way to get a plan without paying.
 */
export async function GET() {
  const me = await currentProfile();
  if (!me) return NextResponse.json({ signedIn: false, active: false });

  const { data } = await supabaseAdmin()
    .from('profiles').select('plan_id').eq('id', me.id).maybeSingle();

  return NextResponse.json({
    signedIn: true,
    role: me.role,
    active: !!data?.plan_id || me.role === 'main_admin',
  });
}
