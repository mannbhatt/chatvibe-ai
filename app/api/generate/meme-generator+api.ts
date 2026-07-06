import { GoogleGenAI } from '@google/genai';
import { enforceUsageLimits, trackGeneration, supabaseAdmin } from '../../../lib/server-utils';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;

    const { prompt, mode } = await request.json();

    if (!prompt || !mode) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    try {
      await enforceUsageLimits(userId);
    } catch (e: any) {
      if (e.message === 'limit_exceeded') {
        return Response.json({ error: 'Generation limit reached. Please upgrade to Pro.' }, { status: 429 });
      }
      return Response.json({ error: 'User not found or error checking limits' }, { status: 404 });
    }

    // Extract base64 and mime type if it has the data URI prefix
    let base64Data = prompt;
    let mimeType = 'image/jpeg';
    if (prompt.startsWith('data:')) {
      const parts = prompt.split(',');
      mimeType = parts[0].split(':')[1].split(';')[0];
      base64Data = parts[1];
    }

    const systemMessage = `You are a viral meme creator. Analyze the provided image and generate 4 different meme captions based on the tone: "${mode}".
Return ONLY a strictly valid JSON object matching this schema exactly:
{
  "captions": [
    "<caption 1>",
    "<caption 2>",
    "<caption 3>",
    "<caption 4>"
  ]
}
DO NOT include markdown tags like \`\`\`json. Output raw JSON only.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { text: systemMessage },
        { inlineData: { data: base64Data, mimeType } }
      ],
      config: {
        temperature: 0.9,
      }
    });

    let rawText = response.text?.trim() || '{}';
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    const jsonResult = JSON.parse(rawText);

    const generation = await trackGeneration(
      userId,
      'meme_generator',
      'image', // input type is image
      '[IMAGE UPLOAD]', // Do not save full base64 in DB to save space, ideally save to Supabase Storage and store URL.
      mode,
      jsonResult,
      'gemini-2.5-flash'
    );

    return Response.json({ 
      success: true, 
      result: jsonResult, 
      generation: generation 
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return Response.json({ error: 'Something went wrong, please try again' }, { status: 500 });
  }
}
