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

    const { prompt, mode, isWhatsApp } = await request.json();

    if (!prompt) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    let aiPrompt = prompt;
    let participants: string[] = [];
    if (isWhatsApp && typeof prompt === 'object' && prompt.messages) {
      aiPrompt = JSON.stringify(prompt.messages);
      participants = prompt.participants || [];
    }

    try {
      await enforceUsageLimits(userId);
    } catch (e: any) {
      if (e.message === 'limit_exceeded') {
        return Response.json({ error: 'Generation limit reached. Please upgrade to Pro.' }, { status: 429 });
      }
      return Response.json({ error: 'User not found or error checking limits' }, { status: 404 });
    }

    const systemMessage = `You are the Chat Detective. Analyze the provided chat log.
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
  "aiSummary": "<string, a short 2-sentence summary of the vibe>",
  "funnyObservations": ["<string>", "<string>"]
}
DO NOT include markdown tags like \`\`\`json. Output raw JSON only.`;

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

    const jsonResult = JSON.parse(rawText);

    const generation = await trackGeneration(
      userId,
      'chat_detective',
      isWhatsApp ? 'whatsapp_export' : 'text',
      isWhatsApp ? '[WhatsApp Export Data]' : prompt,
      mode || 'default',
      { ...jsonResult, participants },
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
