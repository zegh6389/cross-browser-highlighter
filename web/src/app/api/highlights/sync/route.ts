import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { LIMITS } from '@web-highlighter/shared';

// Validation schema for sync request
const highlightSchema = z.object({
  localId: z.string(),
  url: z.string().url(),
  normalizedUrl: z.string(),
  pageTitle: z.string().optional(),
  text: z.string().max(LIMITS.MAX_HIGHLIGHT_TEXT_LENGTH),
  color: z.enum(['yellow', 'green', 'blue', 'pink']),
  anchor: z.object({
    text: z.string(),
    prefix: z.string().optional(),
    suffix: z.string().optional(),
    textBefore: z.string().optional(),
    textAfter: z.string().optional(),
    selector: z.string().optional(),
    startOffset: z.number().optional(),
    endOffset: z.number().optional(),
  }),
  note: z.string().max(LIMITS.MAX_NOTE_LENGTH).optional(),
  noteColor: z.enum(['yellow', 'green', 'blue', 'pink']).optional(),
  createdAt: z.string(),
});

const syncRequestSchema = z.object({
  highlights: z.array(highlightSchema).max(LIMITS.MAX_HIGHLIGHTS_PER_SYNC),
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

    // Parse and validate request body
    const body = await request.json();
    const validation = syncRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { highlights } = validation.data;

    if (highlights.length === 0) {
      return NextResponse.json({
        synced: [],
        failed: [],
        usage: await getUserUsage(supabase, user.id),
      });
    }

    // Calculate total word count for this batch
    const batchWordCount = highlights.reduce((sum, h) => {
      return sum + countWords(h.text);
    }, 0);

    // Check if user can sync
    const { data: canSyncResult } = await supabase.rpc('can_user_sync', {
      p_user_id: user.id,
      p_word_count: batchWordCount,
    });

    const canSync = canSyncResult?.[0];

    if (!canSync?.can_sync) {
      return NextResponse.json({
        synced: [],
        failed: highlights.map(h => ({
          localId: h.localId,
          error: 'WORD_LIMIT_EXCEEDED',
        })),
        usage: {
          currentWords: canSync?.current_words || 0,
          limitWords: canSync?.limit_words || LIMITS.FREE_TIER_WORDS,
          remainingWords: canSync?.remaining_words || 0,
          hasSubscription: canSync?.has_subscription || false,
        },
        limitExceeded: true,
      }, { status: 403 });
    }

    // Process highlights
    const synced: Array<{ localId: string; serverId: string }> = [];
    const failed: Array<{ localId: string; error: string }> = [];

    for (const highlight of highlights) {
      try {
        // Check if highlight already exists (by local_id)
        const { data: existing } = await supabase
          .from('highlights')
          .select('id')
          .eq('user_id', user.id)
          .eq('local_id', highlight.localId)
          .single();

        if (existing) {
          // Update existing highlight
          const { error: updateError } = await supabase
            .from('highlights')
            .update({
              text: highlight.text,
              color: highlight.color,
              anchor: highlight.anchor,
              note: highlight.note,
              note_color: highlight.noteColor,
              synced_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (updateError) throw updateError;
          synced.push({ localId: highlight.localId, serverId: existing.id });
        } else {
          // Insert new highlight
          const { data: newHighlight, error: insertError } = await supabase
            .from('highlights')
            .insert({
              user_id: user.id,
              local_id: highlight.localId,
              url: highlight.url,
              normalized_url: highlight.normalizedUrl,
              page_title: highlight.pageTitle,
              text: highlight.text,
              color: highlight.color,
              anchor: highlight.anchor,
              note: highlight.note,
              note_color: highlight.noteColor,
              created_at: highlight.createdAt,
              synced_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (insertError) throw insertError;
          if (newHighlight) {
            synced.push({ localId: highlight.localId, serverId: newHighlight.id });
          }
        }
      } catch (error) {
        failed.push({
          localId: highlight.localId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Get updated usage
    const usage = await getUserUsage(supabase, user.id);

    return NextResponse.json({
      synced,
      failed,
      usage,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getUserUsage(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: canSyncResult } = await supabase.rpc('can_user_sync', {
    p_user_id: userId,
    p_word_count: 0,
  });

  const result = canSyncResult?.[0];

  return {
    currentWords: result?.current_words || 0,
    limitWords: result?.limit_words || LIMITS.FREE_TIER_WORDS,
    remainingWords: result?.remaining_words || 0,
    hasSubscription: result?.has_subscription || false,
  };
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
