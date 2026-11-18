import { NextRequest, NextResponse } from 'next/server';
import {
  getSavedLeads,
  saveLeadsToJSON,
  getGeneratedEmails,
  updateSingleLead,
  saveBatchGeneratedEmails,
  getSentEmails,
  GeneratedEmailRecord,
} from '@/lib/json-storage';
import { CompanyLead } from '@/lib/sheets';

export async function GET() {
  try {
    const leads = getSavedLeads();
    const generated = getGeneratedEmails();
    const sent = getSentEmails();

    return NextResponse.json({
      success: true,
      totalLeads: leads.length,
      totalGenerated: generated.length,
      totalSent: sent.length,
      leads,
      generated,
      sent,
    });
  } catch (error: any) {
    console.error('Error reading leads/emails JSON storage:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to read data from JSON storage' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Batch save leads
    if (Array.isArray(body.leads)) {
      const incomingLeads: CompanyLead[] = body.leads;
      saveLeadsToJSON(incomingLeads);

      // Extract and sync any leads that have generated bodies into generated_emails.json
      const generatedRecords: GeneratedEmailRecord[] = incomingLeads
        .filter((l) => l.generatedBody && l.generatedSubject)
        .map((l) => ({
          id: `gen-${l.id}`,
          leadId: l.id,
          companyName: l.name,
          category: l.category,
          to: l.email || '',
          subject: l.generatedSubject!,
          body: l.generatedBody!,
          model: 'gemini-3.5-flash-lite',
          status: l.status,
          generatedAt: new Date().toISOString(),
        }));

      if (generatedRecords.length > 0) {
        saveBatchGeneratedEmails(generatedRecords);
      }

      return NextResponse.json({
        success: true,
        message: `${incomingLeads.length} leads synchronisés dans src/data/leads.json`,
        count: incomingLeads.length,
      });
    }

    // 2. Single lead save / update
    if (body.lead) {
      const lead: CompanyLead = body.lead;
      updateSingleLead(lead);

      return NextResponse.json({
        success: true,
        message: `Lead ${lead.name} enregistré dans le fichier JSON`,
        lead,
      });
    }

    return NextResponse.json(
      { error: 'Paramètre "leads" (tableau) ou "lead" (objet) requis' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error saving leads to JSON storage:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save leads to JSON storage' },
      { status: 500 }
    );
  }
}
