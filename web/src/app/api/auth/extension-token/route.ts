import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Generate a one-time token for extension authentication
 * POST /api/auth/extension-token
 */
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

    // Generate extension token using the database function
    const { data: token, error } = await supabase.rpc('generate_extension_token', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Error generating extension token:', error);
      return NextResponse.json(
        { error: 'Failed to generate token' },
        { status: 500 }
      );
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Extension token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
