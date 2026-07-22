import { GoogleGenAI } from '@google/genai';
import { spendUserTokens, refundUserTokens, trackGeneration, supabaseAdmin } from '../../../lib/server-utils';
import { getFeatureCost } from '../../../lib/token-costs';

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

    let prompt = '';
    let mode = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      mode = (formData as any).get('mode') as string;
      const file = (formData as any).get('prompt') as File;
      if (!file) {
        return Response.json({ error: 'Missing image file' }, { status: 400 });
      }
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Str = buffer.toString('base64');
      prompt = `data:${file.type || 'image/jpeg'};base64,${base64Str}`;
    } else {
      const json = await request.json();
      prompt = json.prompt;
      mode = json.mode;
    }

    if (!prompt || !mode) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const cost = getFeatureCost('meme_generator');

    try {
      await spendUserTokens(userId, cost);
    } catch (e: any) {
      if (e.message.startsWith('limit_exceeded')) {
        const parts = e.message.split(':');
        const needed = parts[1] || cost;
        const remaining = parts[2] || 0;
        return Response.json({ error: `Not enough tokens. Needed: ${needed}, Remaining: ${remaining}. Please upgrade to Pro.` }, { status: 429 });
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

    let jsonResult;
    try {
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

      jsonResult = JSON.parse(rawText);
    } catch (aiError) {
      console.error('AI Generation Error:', aiError);
      await refundUserTokens(userId, cost);
      return Response.json({ error: 'AI Generation failed. Please try again.' }, { status: 500 });
    }

    const generation = await trackGeneration(
      userId,
      'meme_generator',
      'image', // input type is image
      '[IMAGE UPLOAD]', // Do not save full base64 in DB to save space, ideally save to Supabase Storage and store URL.
      mode,
      jsonResult,
      'gemini-2.5-flash'
    );

    try {
      await supabaseAdmin.rpc('update_streak', { p_user_id: userId });
    } catch (streakErr) {
      console.error('Streak update failed:', streakErr);
    }


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
