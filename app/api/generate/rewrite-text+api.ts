import { GoogleGenAI } from '@google/genai';
import { spendUserTokens, trackGeneration, supabaseAdmin, refundUserTokens } from '../../../lib/server-utils';
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

    const { prompt, mode } = await request.json();

    if (!prompt || !mode) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const cost = getFeatureCost('rewrite_text');
    console.log('[DEBUG] Calculated cost for rewrite_text:', cost);
    console.log('[DEBUG] userId making this request:', userId);
    console.log('[DEBUG] Calculated cost for rewrite_text:', cost);
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

    const systemMessage = `You are an expert text re-writer. Rewrite the following text strictly matching this tone: "${mode}".
Return ONLY a strictly valid JSON object matching this schema exactly:
{
  "rewrittenText": "<the rewritten text>"
}
DO NOT include markdown tags like \`\`\`json. Output raw JSON only.`;

    let jsonResult;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemMessage,
          temperature: 0.8,
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
      'rewrite_text',
      'text',
      prompt,
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
