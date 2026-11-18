import { NextRequest, NextResponse } from 'next/server';
import { buildEmailPrompt, callGemini, defaultEventDetails } from '@/lib/gemini';
import { CompanyLead } from '@/lib/sheets';
import { saveLeadGeneratedEmail } from '@/lib/json-storage';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, lead, event, globalDirectives, model } = body as {
      apiKey?: string;
      lead: CompanyLead;
      event?: typeof defaultEventDetails;
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

    if (!lead || !lead.name) {
      return NextResponse.json(
        { error: 'Invalid lead data. Company name is required.' },
        { status: 400 }
      );
    }

    const eventDetails = event || defaultEventDetails;
    const { systemInstruction, prompt } = buildEmailPrompt(lead, eventDetails, globalDirectives);

    const targetModel = model || 'gemini-3.5-flash-lite';
    const generated = await callGemini(effectiveApiKey, prompt, systemInstruction, true, targetModel);

    if (!generated.subject || !generated.body) {
      throw new Error('Gemini did not return both subject and body');
    }

    // Persist immediately and atomically to BOTH generated_emails.json and leads.json
    try {
      saveLeadGeneratedEmail({
        leadId: lead.id,
        companyName: lead.name,
        category: lead.category,
        to: lead.email || '',
        subject: generated.subject,
        body: generated.body,
        model: targetModel,
        status: 'draft',
      });
    } catch (saveErr) {
      console.error('Failed to log generated email to JSON storage:', saveErr);
    }

    return NextResponse.json({
      success: true,
      model: targetModel,
      subject: generated.subject,
      body: generated.body,
    });
  } catch (error: any) {
    console.error('Error generating email with Gemini:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate email' },
      { status: 500 }
    );
  }
}
