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
      // Trim raw messages to a sample of 50 to save tokens, while retaining enough context for qualitative analysis
      aiPrompt = JSON.stringify(prompt.messages.slice(-50));
      participants = prompt.participants || [];
      computedStats = computeStats(prompt.messages, participants);
    }

    let messageCount = 1;
    if (isWhatsApp && typeof prompt === 'object' && prompt.messages) {
      messageCount = prompt.messages.length || 1;
    } else if (typeof prompt === 'string') {
      messageCount = prompt.split('\n').filter(l => l.trim().length > 0).length || 1;
    }

    const cost = getFeatureCost('chat_detective', messageCount);

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

    const systemMessage = `You are the Chat Detective. Analyze the provided chat log.
${computedStats ? `\nI have pre-computed conversational statistics for the participants in this chat. YOU MUST ground your analysis, observations, and summaries heavily in these hard numbers rather than making generic statements. For example, instead of saying "Priya seems busy", explicitly state "Priya sent 43% of the messages but took an average of 4 hours to reply." Here are the exact stats:\n${JSON.stringify(computedStats, null, 2)}\n` : ''}
Return ONLY a strictly valid JSON object matching this schema exactly:
{
  "friendshipScore": <number 0-100>,
  "comedyLevel": <number 0-100>,
  "dramaLevel": <number 0-100>,
  "ghostingRisk": <number 0-100>,
  "replyEnergy": <number 0-100>,
  "mood": "<string, e.g. Chaotic, Chill, Passive Aggressive>",
  "mainCharacter": "<string, name of the person driving the conversation>",
  "mostActive": "<string, name of person talking the most>",
  "aiSummary": "<string, a short 2-sentence summary of the vibe (use the computed stats here!)>",
  "funnyObservations": ["<string, ground this observation in the provided stats>", "<string>"]
}
DO NOT include markdown tags like \`\`\`json. Output raw JSON only.`;

    let jsonResult;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: aiPrompt,
        config: {
          systemInstruction: systemMessage,
          temperature: 0.7,
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
      'chat_detective',
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
