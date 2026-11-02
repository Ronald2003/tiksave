import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Configure Supabase before running maintenance.');
const db = createClient(url, key, { auth: { persistSession: false } });
const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
// Signed upload tokens live for two hours. Wait an extra hour before removing reservations.
const { data, error } = await db.from('videos').select('id,owner_id').in('upload_state',['pending','deleting']).lt('created_at',cutoff).limit(100);
if (error) throw new Error('Could not read expired upload reservations.');
let cleaned = 0;
for (const video of data) {
  const { error: storageError } = await db.storage.from('originals').remove([`${video.owner_id}/${video.id}/original.mp4`]);
  if (storageError) throw new Error('Storage cleanup failed; reservation retained for retry.');
  const { error: rowError } = await db.from('videos').delete().eq('id',video.id).in('upload_state',['pending','deleting']);
  if (rowError) throw new Error('Reservation cleanup failed; retry maintenance.');
  cleaned++;
}
const { error: rateError } = await db.from('rate_limits').delete().lt('window_start',new Date(Date.now()-86400000).toISOString());
if (rateError) throw new Error('Rate-limit cleanup failed.');
console.log(`Removed ${cleaned} expired reservations and old rate counters. Re-run if the batch was full.`);
