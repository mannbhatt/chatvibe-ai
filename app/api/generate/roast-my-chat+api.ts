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

    let messageCount = 1;
    if (isWhatsApp && typeof prompt === 'object' && prompt.messages) {
      messageCount = prompt.messages.length || 1;
    } else if (typeof prompt === 'string') {
      messageCount = prompt.split('\n').filter(l => l.trim().length > 0).length || 1;
    }

    const cost = getFeatureCost('roast_my_chat', messageCount);

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

    const TONE_EXAMPLES: Record<string, any[]> = {
      "Friendly": [
        { participant: "Rahul", roast: "Hey Rahul, I noticed you take 3 days to reply but your texts are longer than a Lord of the Rings book! We love the dedication though ❤️" },
        { participant: "Priya", roast: "Priya really hits 'send' after every single word, giving us 45 notifications just to say 'I am on my way'. We still love you bestie!" },
        { participant: "Amit", roast: "Amit's signature move is responding to a paragraph with just '👍'. Such a man of few words!" }
      ],
      "Savage": [
        { participant: "Rahul", roast: "Rahul replies slower than software updates, and his one-word 'k' replies are exactly why he's single." },
        { participant: "Priya", roast: "Priya sends 15 messages just to ask 'what's up'. Learn how to use paragraphs, it's not a telegram." },
        { participant: "Amit", roast: "Amit leaves people on read for 48 hours then replies 'lol'. Nobody is laughing, Amit." }
      ],
      "Gen Z": [
        { participant: "Rahul", roast: "not rahul taking 4 business days to reply 'fr' 😭 I'm deceased" },
        { participant: "Priya", roast: "priya spamming 12 messages in a row is giving major main character syndrome 💀" },
        { participant: "Amit", roast: "amit leaving everyone on read is so un-slay. bro thinks he's mysterious but he just forgot to reply" }
      ],
      "Corporate": [
        { participant: "Rahul", roast: "Per my last email, it seems Rahul's KPI for reply time is severely lacking, taking 72 hours for a single acknowledgment." },
        { participant: "Priya", roast: "Priya, let's circle back on your strategy of sending 20 separate messages instead of one cohesive update." },
        { participant: "Amit", roast: "Amit's utilization of the 'seen' feature without actionable follow-up does not align with our synergistic goals." }
      ],
      "Gujarati": [
        { participant: "Rahul", roast: "Arre Rahul, 3 divas pachi 'k' bole che? Thodo time par reply aaptu kar ne bhai!" },
        { participant: "Priya", roast: "Priya ek vaat maate 15 message mokle che, dhokla jeva lambaa messages kon vacchse?" },
        { participant: "Amit", roast: "Amit bhai toh seen kari ne bhuli j thay che, su yaar." }
      ],
      "Bollywood Drama": [
        { participant: "Rahul", roast: "Kya yahi pyaar hai Rahul? Tumhare ek 'k' ke intezaar mein meri poori zindagi guzar gayi!" },
        { participant: "Priya", roast: "Priya, tumhare 100 messages dekh kar lagta hai jaise K-Serial ka naya episode shuru ho gaya ho!" },
        { participant: "Amit", roast: "Amit ne message seen kiya aur reply nahi diya! Yeh kaisa insaaf hai Thakur?!" }
      ],
      "Sarcastic Bestie": [
        { participant: "Rahul", roast: "Wow Rahul, took you 3 days to reply 'lol'. Such a conversational genius you are." },
        { participant: "Priya", roast: "Oh great, another voice note from Priya that's basically just 2 minutes of heavy breathing and 'umm'. Riveting." },
        { participant: "Amit", roast: "Thanks for leaving me on read Amit, I really enjoyed the suspense of wondering if you died or just ignored me." }
      ],
      "Roast Battle": [
        { participant: "Rahul", roast: "Yo, Rahul's typing speed is so slow, his keyboard has cobwebs! Takes him a week to say 'ok'!" },
        { participant: "Priya", roast: "Priya sends 50 texts just to say 'hello', you ain't writing a haiku, bro! Learn to press space instead of send!" },
        { participant: "Amit", roast: "Amit looks at the screen, sees the text, and his brain just logs out! The ghosting champion of the century!" }
      ]
    };

    const toneExamples = TONE_EXAMPLES[mode] || TONE_EXAMPLES["Savage"];

    const systemMessage = `You are a savage chat roaster. Analyze the chat log and roast the participants based on the tone: "${mode}".
Focus on specific behavioral habits like reply timing, message length, spamming, ignoring people, emoji usage, etc. Do NOT use generic insults. Be specific to what they actually do in the chat.

Here are examples of the exact style and behavioral focus expected for this tone:
${JSON.stringify(toneExamples, null, 2)}

Return ONLY a strictly valid JSON object matching this schema exactly:
{
  "roasts": [
    { "participant": "<name>", "roast": "<the roast text>" }
  ],
  "overallVibe": "<a one sentence brutal summary of the chat in the specified tone>"
}
Ensure you roast up to the 7 most active participants in the chat. Do not exceed 7.
DO NOT include markdown tags like \`\`\`json. Output raw JSON only.`;

    let jsonResult;
    try {
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

      jsonResult = JSON.parse(rawText);
    } catch (aiError) {
      console.error('AI Generation Error:', aiError);
      await refundUserTokens(userId, cost);
      return Response.json({ error: 'AI Generation failed. Please try again.' }, { status: 500 });
    }

    const generation = await trackGeneration(
      userId,
      'roast_my_chat',
      isWhatsApp ? 'whatsapp_export' : 'text',
      isWhatsApp ? '[WhatsApp Export Data]' : prompt,
      mode,
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
