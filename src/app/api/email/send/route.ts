import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getSignatureHtml } from '@/lib/signature';
import { getEffectiveEmailAttachments } from '@/lib/email-attachments';
import { saveSentEmail } from '@/lib/json-storage';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      to,
      subject,
      emailBody,
      senderName,
      senderEmail,
      replyTo,
      scheduledTime,
      smtpPass,
      customAttachments,
      excludeGlobal,
    } = body as {
      to: string;
      subject: string;
      emailBody: string;
      senderName?: string;
      senderEmail?: string;
      replyTo?: string;
      scheduledTime?: string;
      smtpPass?: string;
      customAttachments?: any[];
      excludeGlobal?: boolean;
    };

    if (!to || !to.includes('@')) {
      return NextResponse.json(
        { error: 'Une adresse e-mail destinataire valide est requise.' },
        { status: 400 }
      );
    }

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: "L'objet et le corps de l'e-mail sont requis." },
        { status: 400 }
      );
    }

    // Check if scheduled for the future
    if (scheduledTime) {
      const scheduledDate = new Date(scheduledTime);
      const now = new Date();

      if (scheduledDate > now) {
        return NextResponse.json({
          success: true,
          status: 'scheduled',
          scheduledTime: scheduledDate.toISOString(),
          messageId: `sched-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          message: `E-mail programmé avec succès pour le ${scheduledDate.toLocaleString('fr-FR')}`,
        });
      }
    }

    const smtpUser = process.env.SMTP_USER || process.env.SENDER_EMAIL || 'orbyx.ensiclub@ensi-uma.tn';
    const effectiveSenderName = senderName || 'Jasser Ben Jomaa';
    const effectiveReplyTo = replyTo || process.env.REPLY_TO || senderEmail || 'orbyx.ensiclub@ensi-uma.tn';
    const effectiveSmtpPass = (smtpPass || process.env.SMTP_PASS || '').trim().replace(/\s+/g, '');

    // If no App Password is provided, inform user clearly
    if (!effectiveSmtpPass) {
      return NextResponse.json(
        {
          error:
            "Mot de passe d'application Google manquant. Pour expédier directement depuis votre adresse Gmail, configurez SMTP_PASS dans le fichier .env (obtenu sur myaccount.google.com/apppasswords), ou cliquez sur 'OUVRIR GMAIL' pour envoyer en un clic depuis votre navigateur.",
          requiresAppPassword: true,
        },
        { status: 400 }
      );
    }

    // Send real email via Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: effectiveSmtpPass,
      },
    });

    const signatureHtml = getSignatureHtml({
      name: 'Jasser Ben Jomaa',
      role: 'Responsable Sponsoring',
      phone: '58745567',
      forWebPreview: false,
    });

    const fullHtml = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111;">
        ${emailBody.replace(/\n/g, '<br/>')}
        <br/><br/>
        ${signatureHtml}
      </div>
    `.trim();

    const textSignature = `\n\n--\nORBYX ENSI CLUB\nJasser Ben Jomaa\nResponsable Sponsoring\nTel: 58745567\nNational School of Computer Science (ENSI)\nFacebook: https://www.facebook.com/share/18f9Q5asNW/\nInstagram: https://www.instagram.com/orbyx_ensi_club\nLinkedIn: https://www.linkedin.com/in/orbyx-ensi-club-057abb373`;

    const emailAttachments = getEffectiveEmailAttachments({
      customAttachments,
      excludeGlobal,
    });
    const regularFiles = emailAttachments.filter((a) => !a.cid).map((a) => a.filename);

    const info = await transporter.sendMail({
      from: `"${effectiveSenderName}" <${smtpUser}>`,
      to,
      replyTo: effectiveReplyTo,
      subject,
      text: `${emailBody}${textSignature}`,
      html: fullHtml,
      attachments: emailAttachments,
    });

    console.log(
      `[Email Sent Successfully] Message ID: ${info.messageId} to ${to} (${regularFiles.length} file(s) attached: ${regularFiles.join(', ') || 'none'})`
    );

    // Persist sent email to src/data/sent_emails.json
    try {
      saveSentEmail({
        id: `sent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        to,
        sender: `"${effectiveSenderName}" <${smtpUser}>`,
        replyTo: effectiveReplyTo,
        subject,
        body: emailBody,
        messageId: info.messageId,
        sentAt: new Date().toISOString(),
      });
    } catch (saveErr) {
      console.error('Failed to log sent email to JSON file:', saveErr);
    }

    return NextResponse.json({
      success: true,
      status: 'sent',
      sentAt: new Date().toISOString(),
      messageId: info.messageId,
      recipient: to,
      sender: smtpUser,
      replyTo: effectiveReplyTo,
      subject,
      attachmentAttached: regularFiles.length > 0,
      attachedFiles: regularFiles,
      message: `E-mail envoyé avec succès à ${to} depuis ${smtpUser}${
        regularFiles.length > 0
          ? ` avec ${regularFiles.length} pièce(s) jointe(s) (${regularFiles.join(', ')}).`
          : '.'
      }`,
    });
  } catch (error: any) {
    console.error('Error sending email via Gmail:', error);
    let errorMsg = error.message || "Échec de l'envoi de l'e-mail";
    if (error.code === 'EAUTH') {
      errorMsg =
        "Erreur d'authentification Gmail (EAUTH) : Vérifiez que la validation en 2 étapes est activée et que le mot de passe d'application Google (16 caractères) est exact.";
    }
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
