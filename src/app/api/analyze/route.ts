import { analyzeUrl } from '@/lib/analyzer';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  let url: string;
  try {
    const body = await request.json();
    url = body.url;
    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'url is required' }, { status: 400 });
    }
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
  } catch {
    return Response.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  const result = await analyzeUrl(url);
  return Response.json(result);
}
