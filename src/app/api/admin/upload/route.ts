import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/auth';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB — comfortably inside the free tier
const ALLOWED = /^(image\/(png|jpeg|jpg|webp|gif|svg\+xml)|video\/(mp4|webm))$/;

export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file');
  const folder = String(form.get('folder') ?? 'misc');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File is too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 400 }
    );
  }
  if (!ALLOWED.test(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}` },
      { status: 400 }
    );
  }

  const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const db = supabaseAdmin();
  const { error } = await db.storage
    .from('card-media')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = db.storage.from('card-media').getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
