import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession, STRIPE_PRICES } from '@/lib/stripe';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const createCheckoutSchema = z.object({
  priceType: z.enum(['MONTHLY', 'YEARLY']),
});

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validation = createCheckoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { priceType } = validation.data;
    const priceId = STRIPE_PRICES[priceType];

    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid price type' },
        { status: 400 }
      );
    }

    // Get user's Stripe customer ID if exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create checkout session
    const session = await createCheckoutSession({
      customerId: profile?.stripe_customer_id || undefined,
      priceId,
      successUrl: `${appUrl}/subscription?success=true`,
      cancelUrl: `${appUrl}/subscription?canceled=true`,
      userId: user.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Create checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
