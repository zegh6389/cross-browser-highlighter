import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const exchangeTokenSchema = z.object({
  token: z.string().min(1),
});

/**
 * Exchange one-time token for user session info
 * POST /api/auth/exchange-token
 * 
 * Called by the browser extension to authenticate
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = exchangeTokenSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 }
      );
    }

    const { token } = validation.data;

    // Use service client to exchange token (bypasses RLS)
    const supabase = createServiceClient();

    const { data: result, error } = await supabase.rpc('exchange_extension_token', {
      p_token: token,
    });

    if (error) {
      console.error('Token exchange error:', error);
      return NextResponse.json(
        { error: 'Token exchange failed' },
        { status: 500 }
      );
    }

    const tokenResult = result?.[0];

    if (!tokenResult?.is_valid) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Generate a new session for the extension
    // Note: In production, you might want to create a custom JWT or use Supabase's
    // signInWithIdToken for the extension. For now, we return user info.
    
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', tokenResult.user_id)
      .single();

    // Check subscription status
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', tokenResult.user_id)
      .eq('status', 'active')
      .single();

    // Log the authentication
    await supabase.rpc('log_audit_event', {
      p_user_id: tokenResult.user_id,
      p_action: 'extension_authenticated',
      p_metadata: { ip: request.headers.get('x-forwarded-for') },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: tokenResult.user_id,
        email: tokenResult.email,
        role: tokenResult.role,
        fullName: profile?.full_name,
        hasSubscription: !!subscription,
      },
    });
  } catch (error) {
    console.error('Exchange token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
