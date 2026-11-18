import { NextRequest, NextResponse } from 'next/server';
import { buildChatRefinementPrompt, callGemini, defaultEventDetails } from '@/lib/gemini';
import { CompanyLead } from '@/lib/sheets';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, lead, event, currentSubject, currentBody, userMessage, history, globalDirectives, model } = body as {
      apiKey?: string;
      lead: CompanyLead;
      event?: typeof defaultEventDetails;
      currentSubject: string;
      currentBody: string;
      userMessage: string;
      history: Array<{ sender: 'user' | 'assistant'; text: string }>;
      globalDirectives?: string;
      model?: string;
    };

    const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY;

    if (!effectiveApiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key is missing. Please provide your API key in the settings.' },
        { status: 400 }
      );
    }

    if (!lead || !userMessage) {
      return NextResponse.json(
        { error: 'Lead and user message are required' },
        { status: 400 }
      );
    }

    const eventDetails = event || defaultEventDetails;
    const { systemInstruction, prompt } = buildChatRefinementPrompt(
      lead,
      eventDetails,
      currentSubject || '',
      currentBody || '',
      userMessage,
      history || [],
      globalDirectives
    );

    const targetModel = model || 'gemini-3.5-flash-lite';
    const result = await callGemini(effectiveApiKey, prompt, systemInstruction, true, targetModel);

    return NextResponse.json({
      success: true,
      model: targetModel,
      reply: result.reply || "Voici les modifications apportées à l'e-mail.",
      subject: result.subject || currentSubject,
      body: result.body || currentBody,
    });
  } catch (error: any) {
    console.error('Error in Gemini chat refinement:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to refine email with AI' },
      { status: 500 }
    );
  }
}
