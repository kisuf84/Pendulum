import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { userId, userProfile } = await request.json();
    
    if (!userId) {
      return Response.json({ error: 'No user ID provided' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!apiKey || !supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Missing configuration' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const client = new Anthropic({ apiKey });

    // Get entries from the past week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select('entry_text, reflection, created_at')
      .eq('user_id', userId)
      .gte('created_at', oneWeekAgo.toISOString())
      .order('created_at', { ascending: true });

    if (entriesError) {
      throw new Error('Failed to fetch entries');
    }

    if (!entries || entries.length === 0) {
      return Response.json({ 
        synthesis: null,
        message: 'No entries this week'
      });
    }

    // Build the synthesis prompt
    const name = userProfile?.name || 'friend';
    const style = userProfile?.communication_style || 'warm';
    
    let styleGuide = '';
    switch (style) {
      case 'direct':
        styleGuide = 'Be clear and concise. No fluff.';
        break;
      case 'poetic':
        styleGuide = 'Use metaphor and imagery. Speak to the myth beneath the surface.';
        break;
      case 'minimal':
        styleGuide = 'As few words as possible. Let silence do the work.';
        break;
      default:
        styleGuide = 'Be warm and supportive, like a wise friend.';
    }

    const entriesText = entries.map((e, i) => {
      const date = new Date(e.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      return `[${date}]\n${e.entry_text}`;
    }).join('\n\n---\n\n');

    const systemPrompt = `You are Pendulum, generating a weekly synthesis for ${name}.

Your task is to read their entries from the past week and surface the through-line. What thread connects these reflections? What pattern is emerging? What is asking for attention?

${styleGuide}

Rules:
- One paragraph only
- Do not summarize each entry, find the deeper thread
- Do not use em dashes
- Do not give advice unless it emerges naturally from the pattern
- Speak to them directly
- This should feel like a gift, not a report`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        { 
          role: "user", 
          content: `Here are ${name}'s entries from this week:\n\n${entriesText}\n\nGenerate the weekly synthesis.`
        }
      ]
    });

    const synthesis = message.content[0].text;

    // Store the synthesis
    const { error: insertError } = await supabase
      .from('weekly_syntheses')
      .insert({
        user_id: userId,
        synthesis_text: synthesis,
        entries_count: entries.length,
        week_start: oneWeekAgo.toISOString(),
        week_end: new Date().toISOString()
      });

    if (insertError) {
      console.error('Failed to store synthesis:', insertError);
      // Continue anyway, just log the error
    }

    return Response.json({ 
      synthesis,
      entriesCount: entries.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Synthesis API error:', error);
    return Response.json({ 
      error: 'Failed to generate synthesis' 
    }, { status: 500 });
  }
}
