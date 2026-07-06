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

    if (!prompt || !mode) {
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

    const systemMessage = `You are a savage chat roaster. Analyze the chat log and roast the participants based on the tone: "${mode}".
Return ONLY a strictly valid JSON object matching this schema exactly:
{
  "roasts": [
    { "participant": "<name>", "roast": "<the roast text>" }
  ],
  "overallVibe": "<a one sentence brutal summary of the chat>"
}
Ensure you roast up to the 7 most active participants in the chat. Do not exceed 7.
DO NOT include markdown tags like \`\`\`json. Output raw JSON only.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: aiPrompt,
      config: {
        systemInstruction: systemMessage,
        temperature: 0.8,
      }
    });

    let rawText = response.text?.trim() || '{}';
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    const jsonResult = JSON.parse(rawText);

    const generation = await trackGeneration(
      userId,
      'roast_my_chat',
      isWhatsApp ? 'whatsapp_export' : 'text',
      isWhatsApp ? '[WhatsApp Export Data]' : prompt,
      mode,
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
