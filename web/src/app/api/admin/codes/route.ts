import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { asProfile, asActivationCodes } from '@/lib/db-types';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin role
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  const profile = asProfile(profileData);

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get all codes with creator and user info
  const { data: codesData, error } = await supabase
    .from('admin_activation_codes')
    .select(`
      *,
      creator:created_by(email, full_name),
      user:used_by(email, full_name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch codes' }, { status: 500 });
  }

  const codes = asActivationCodes(codesData);

  return NextResponse.json({ codes });
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin role
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  const profile = asProfile(profileData);

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Generate secure random code
  const code = crypto.randomBytes(16).toString('hex');
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');

  // Set expiry to 7 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Insert the code
  const { error } = await supabase
    .from('admin_activation_codes')
    .insert({
      code_hash: codeHash,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    } as any); // Type assertion needed due to Supabase type inference issue

  if (error) {
    console.error('Failed to create code:', error);
    return NextResponse.json({ error: 'Failed to create code' }, { status: 500 });
  }

  // Return the UNHASHED code (only time it's visible!)
  return NextResponse.json({
    code,
    expires_at: expiresAt.toISOString(),
  });
}
