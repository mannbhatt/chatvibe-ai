import { GoogleGenAI } from '@google/genai';
import { spendUserTokens, trackGeneration, supabaseAdmin, refundUserTokens } from '../../../lib/server-utils';
import { getFeatureCost } from '../../../lib/token-costs';
import { computeStats } from '../../../lib/chat-stats';

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

    const { prompt, mode, isWhatsApp } = await request.json();

    if (!prompt) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    let aiPrompt = prompt;
    let participants: string[] = [];
    let computedStats: any = null;
    
    if (isWhatsApp && typeof prompt === 'object' && prompt.messages) {
      // Aggressively trim raw messages to save tokens.
      aiPrompt = "[Raw messages omitted for token efficiency. Refer entirely to the computed stats for your vibe analysis.]";
      participants = prompt.participants || [];
      computedStats = computeStats(prompt.messages, participants);
    }

    let messageCount = 1;
    if (isWhatsApp && typeof prompt === 'object' && prompt.messages) {
      messageCount = prompt.messages.length || 1;
    } else if (typeof prompt === 'string') {
      messageCount = prompt.split('\n').filter(l => l.trim().length > 0).length || 1;
    }

    const cost = getFeatureCost('vibe_check', messageCount);

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

    const systemMessage = `You are a Vibe Checker. Analyze the provided text or chat log.
${computedStats ? `\nI have pre-computed conversational statistics for the participants in this chat. YOU MUST heavily ground your scores (Friendship, Flirting, Drama, Chaos, Sarcasm, Energy, Mood) in these hard numbers rather than your unaided read of the raw text. For example, high ghosting gaps should lower Friendship or Flirting scores, high message volume or emojis should affect Energy, etc. Here are the exact stats:\n${JSON.stringify(computedStats, null, 2)}\n` : ''}
Return ONLY a strictly valid JSON object matching this schema exactly:
{
  "metrics": {
    "Friendship": <number 0-100>,
    "Flirting": <number 0-100>,
    "Drama": <number 0-100>,
    "Chaos": <number 0-100>,
    "Sarcasm": <number 0-100>,
    "Energy": <number 0-100>,
    "Mood": <number 0-100>
  },
  "summary": "<a one sentence summary of the overall vibe>"
}
DO NOT include markdown tags like \`\`\`json. Output raw JSON only.`;

    let jsonResult;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: aiPrompt,
        config: {
          systemInstruction: systemMessage,
          temperature: 0.6,
        }
      });

      let rawText = response.text?.trim() || '{}';
      if (rawText.startsWith('```json')) {
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      }

      jsonResult = JSON.parse(rawText);
      if (computedStats) {
        jsonResult.computedStats = computedStats;
      }
    } catch (aiError) {
      console.error('AI Generation Error:', aiError);
      await refundUserTokens(userId, cost);
      return Response.json({ error: 'AI Generation failed. Please try again.' }, { status: 500 });
    }

    const generation = await trackGeneration(
      userId,
      'vibe_check',
      isWhatsApp ? 'whatsapp_export' : 'text',
      isWhatsApp ? '[WhatsApp Export Data]' : prompt,
      mode || 'default',
      { ...jsonResult, participants },
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
