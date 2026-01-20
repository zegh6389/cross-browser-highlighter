import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const FREE_WORD_LIMIT = 300;

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get usage data
  const { data: usage } = await supabase
    .from('usage_tracking')
    .select('synced_word_count, synced_highlights_count')
    .eq('user_id', user.id)
    .single();

  // Check subscription status
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  const hasSubscription = !!subscription;
  const syncedWordCount = usage?.synced_word_count || 0;
  const syncedHighlightsCount = usage?.synced_highlights_count || 0;

  return NextResponse.json({
    synced_word_count: syncedWordCount,
    synced_highlights_count: syncedHighlightsCount,
    word_limit: hasSubscription ? null : FREE_WORD_LIMIT,
    has_subscription: hasSubscription,
    subscription_status: subscription?.status || null,
    remaining_words: hasSubscription ? null : Math.max(0, FREE_WORD_LIMIT - syncedWordCount),
  });
}
