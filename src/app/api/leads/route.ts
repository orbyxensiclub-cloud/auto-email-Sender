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
import { isKVConfigured, getFromKV, saveToKV } from '@/lib/cloud-storage';

export async function GET() {
  try {
    // 1. If Upstash Redis / Vercel KV is configured, read from Cloud KV first
    if (isKVConfigured()) {
      const kvLeads = await getFromKV<CompanyLead[]>('v5_leads');
      const kvGenerated = await getFromKV<GeneratedEmailRecord[]>('v5_generated');
      const kvSent = await getFromKV<any[]>('v5_sent');

      if (kvLeads && Array.isArray(kvLeads) && kvLeads.length > 0) {
        return NextResponse.json({
          success: true,
          source: 'cloud_kv',
          totalLeads: kvLeads.length,
          totalGenerated: (kvGenerated || []).length,
          totalSent: (kvSent || []).length,
          leads: kvLeads,
          generated: kvGenerated || [],
          sent: kvSent || [],
        });
      }
    }

    // 2. Fallback to local / tmp JSON storage
    const leads = getSavedLeads();
    const generated = getGeneratedEmails();
    const sent = getSentEmails();

    return NextResponse.json({
      success: true,
      source: 'json_file',
      totalLeads: leads.length,
      totalGenerated: generated.length,
      totalSent: sent.length,
      leads,
      generated,
      sent,
    });
  } catch (error: any) {
    console.error('Error reading leads/emails storage:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to read data from storage' },
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

      // Extract generated records
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

      // Persist to Cloud KV if configured (e.g. Upstash Redis on Vercel)
      if (isKVConfigured()) {
        await saveToKV('v5_leads', incomingLeads);
        if (generatedRecords.length > 0) {
          await saveToKV('v5_generated', generatedRecords);
        }
      }

      return NextResponse.json({
        success: true,
        message: `${incomingLeads.length} leads synchronisés avec succès.`,
        count: incomingLeads.length,
        cloudSync: isKVConfigured(),
      });
    }

    // 2. Single lead save / update
    if (body.lead) {
      const lead: CompanyLead = body.lead;
      updateSingleLead(lead);

      return NextResponse.json({
        success: true,
        message: `Lead ${lead.name} enregistré avec succès.`,
        lead,
      });
    }

    return NextResponse.json(
      { error: 'Paramètre "leads" (tableau) ou "lead" (objet) requis' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error saving leads to storage:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save leads to storage' },
      { status: 500 }
    );
  }
}
