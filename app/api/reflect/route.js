import Anthropic from '@anthropic-ai/sdk';
import { generateSystemPrompt, generateEchoPrompt, generateDreamPrompt } from '../../../lib/seed';
import { analyzeLanguage, formatLanguageContext } from '../../../lib/languageAnalysis';

// Language instructions for Claude
const LANGUAGE_INSTRUCTIONS = {
  en: 'LANGUAGE: Respond entirely in English.',
  es: 'IDIOMA: Responde COMPLETAMENTE en español. Todo el texto, incluyendo "noted" (usa "anotado"), debe estar en español. Usa un tono cálido y natural.',
  fr: 'LANGUE: Réponds ENTIÈREMENT en français. Tout le texte, y compris "noted" (utilise "noté"), doit être en français. Utilise un ton chaleureux et naturel.'
};

export async function POST(request) {
  try {
    const { 
      entry, 
      previousEntries, 
      daysSinceLastEntry, 
      timeOfDay, 
      userProfile,
      weather,
      location,
      isDream,
      language = 'en'
    } = await request.json();
    
    if (!entry || entry.trim().length === 0) {
      return Response.json({ error: 'No entry provided' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return Response.json({ 
        error: 'API key not configured. Add ANTHROPIC_API_KEY to your environment.' 
      }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    // Generate dynamic system prompt based on user profile and dream mode
    let systemPrompt = isDream 
      ? generateDreamPrompt(userProfile)
      : generateSystemPrompt(userProfile);
    
    // Add language instruction
    const langInstruction = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS['en'];
    systemPrompt = `${langInstruction}\n\n${systemPrompt}`;

    // Analyze language patterns (skip for dreams)
    const languageAnalysis = isDream ? null : analyzeLanguage(entry, previousEntries);
    const languageContext = languageAnalysis ? formatLanguageContext(languageAnalysis) : null;

    // Build context section
    let contextSection = 'CURRENT CONTEXT:\n';
    
    // Dream mode indicator
    if (isDream) {
      contextSection += `- Entry type: DREAM\n`;
    }
    
    // Time of day
    const timeDescriptor = 
      timeOfDay < 6 ? 'deep night' :
      timeOfDay < 12 ? 'morning' :
      timeOfDay < 17 ? 'afternoon' :
      timeOfDay < 21 ? 'evening' :
      'late night';
    contextSection += `- Time: ${timeDescriptor}\n`;
    
    // Days since last entry
    if (daysSinceLastEntry !== null && daysSinceLastEntry !== undefined) {
      if (daysSinceLastEntry === 0) {
        contextSection += `- Last entry: earlier today\n`;
      } else if (daysSinceLastEntry === 1) {
        contextSection += `- Last entry: yesterday\n`;
      } else {
        contextSection += `- Last entry: ${daysSinceLastEntry} days ago\n`;
      }
    } else {
      contextSection += `- This is their first entry\n`;
    }

    // Weather context (if provided)
    if (weather) {
      let weatherDesc = '';
      if (weather.condition) {
        weatherDesc += weather.condition;
      }
      if (weather.temp) {
        weatherDesc += weatherDesc ? `, ${weather.temp}` : weather.temp;
      }
      if (weatherDesc) {
        contextSection += `- Weather: ${weatherDesc}\n`;
      }
    }

    // Location context (if provided)
    if (location && location.city) {
      contextSection += `- Location: ${location.city}${location.country ? `, ${location.country}` : ''}\n`;
    }

    // Language analysis context
    if (languageContext) {
      contextSection += '\nLANGUAGE PATTERNS DETECTED:\n';
      contextSection += languageContext + '\n';
    }
    
    contextSection += '\n---\n\n';

    // Build the user message with context from previous entries
    let userMessage = contextSection;
    
    if (previousEntries && previousEntries.length > 0) {
      userMessage += "PREVIOUS ENTRIES (for pattern detection):\n\n";
      previousEntries.slice(-10).forEach((prev) => {
        const entryText = prev.entry || prev.entry_text || '';
        const timestamp = prev.timestamp || prev.created_at;
        const date = new Date(timestamp).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        userMessage += `[${date}]\n${entryText}\n\n`;
      });
      userMessage += "---\n\n";
    }
    
    userMessage += "CURRENT ENTRY:\n\n" + entry;

    // Get main reflection
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: "user", content: userMessage }
      ]
    });

    const response = message.content[0].text;

    // Generate morning echo for next day (if it's evening/night)
    let morningEcho = null;
    if (timeOfDay >= 18 || timeOfDay < 4) {
      try {
        let echoPrompt = generateEchoPrompt(userProfile, entry);
        // Add language instruction to echo
        echoPrompt = `${langInstruction}\n\n${echoPrompt}`;
        const echoMessage = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 100,
          system: echoPrompt,
          messages: [
            { role: "user", content: "Generate the morning echo." }
          ]
        });
        morningEcho = echoMessage.content[0].text;
      } catch (echoError) {
        console.error('Echo generation failed:', echoError);
        // Continue without echo
      }
    }

    return Response.json({ 
      response,
      morningEcho,
      languageAnalysis: languageAnalysis ? {
        urgency: languageAnalysis.urgency?.level || 'neutral',
        temporal: languageAnalysis.temporal?.orientation || 'present',
        agency: languageAnalysis.agency?.level || 'neutral',
        repeatedWords: languageAnalysis.repetition?.repeatedWords?.slice(0, 3) || []
      } : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Pendulum API error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return Response.json({ 
      error: 'Failed to process your reflection. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
