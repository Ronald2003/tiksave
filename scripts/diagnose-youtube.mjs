// Temporary deployment diagnostic; prints only bounded, redacted provider failures.
const token = process.env.APIFY_API_TOKEN;
if (token) {
  const get = async path => {
    const response = await fetch(`https://api.apify.com/v2/${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
    return response.json();
  };
  const redact = text => String(text || '').replaceAll(token, '[redacted]').replace(/https?:\/\/\S+/g, '[url]').slice(0,1500);
  try {
    const runs = await get('acts/ZSKNl5eniyeAPcPkf/runs?desc=true&limit=3');
    for (const run of runs.data.items) {
      const items = await get(`datasets/${run.defaultDatasetId}/items?clean=true&limit=2`);
      console.log('YOUTUBE_DIAGNOSTIC', JSON.stringify({ run: run.id, status: run.status, message: redact(run.statusMessage), items: items.map(item => ({ keys: Object.keys(item), status: item.status, error: redact(item.error), videoId: item.videoId, quality: item.deliveredQuality })) }));
    }
  } catch (error) { console.log('YOUTUBE_DIAGNOSTIC', redact(error.message)); }
}
