import { GoogleGenAI } from '@google/genai';
import { enforceUsageLimits, trackGeneration, supabaseAdmin } from '../../../lib/server-utils';

// Requires GEMINI_API_KEY in .env
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

    // 1. Verify user limits
    try {
      await enforceUsageLimits(userId);
    } catch (e: any) {
      if (e.message === 'limit_exceeded') {
        return Response.json({ error: 'Generation limit reached. Please upgrade to Pro.' }, { status: 429 });
      }
      return Response.json({ error: 'User not found or error checking limits' }, { status: 404 });
    }

    // 2. System Prompts based on Mode
    let systemMessage = 'Translate the following text into emojis.';
    if (mode === 'Minimal') systemMessage = 'Translate the text using maximum 3 emojis. No text.';
    if (mode === 'Funny') systemMessage = 'Translate the text into a hilarious, exaggerated string of emojis.';
    if (mode === 'Chaotic') systemMessage = 'Translate the text using completely random, chaotic, loosely related emojis.';
    if (mode === 'Gen Z') systemMessage = 'Translate the text using Gen Z slang emojis (skull, sob, sparkles, etc). No text.';
    if (mode === 'Emoji Only') systemMessage = 'Translate the text completely into emojis, absolutely no text output allowed.';

    // 3. Call Gemini Free API
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemMessage,
        temperature: 0.7,
        maxOutputTokens: 100,
      }
    });

    const emojiResult = response.text?.trim() || '🤷‍♂️';

    // 4. Decrement Limit & Save Generation
    const generation = await trackGeneration(
      userId,
      'text_to_emoji',
      'text',
      prompt,
      mode,
      { emoji: emojiResult },
      'gemini-2.5-flash'
    );

    return Response.json({ 
      success: true, 
      result: emojiResult, 
      generation: generation 
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return Response.json({ error: 'Something went wrong, please try again' }, { status: 500 });
  }
}
