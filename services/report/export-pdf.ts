import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { AssessmentHistoryItem, UserProfile } from '@/types/models';

function esc(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function list(items: string[]) {
  if (items.length === 0) return '<li>None</li>';
  return items.map((item) => `<li>${esc(item)}</li>`).join('');
}

function section(title: string, content: string) {
  return `<h3>${esc(title)}</h3><div>${content}</div>`;
}

function reportHtml(item: AssessmentHistoryItem, profile: UserProfile | null) {
  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; padding: 24px; color: #111827; }
        h1 { margin-bottom: 6px; }
        .muted { color: #4B5563; font-size: 12px; margin-bottom: 16px; }
        .card { border: 1px solid #E5E7EB; border-radius: 12px; padding: 12px 14px; margin-bottom: 12px; }
        h3 { margin: 0 0 6px; }
        p, li { font-size: 13px; line-height: 1.5; }
        ul { margin: 0; padding-left: 18px; }
        .deferred { margin-top: 16px; background: #FEF3C7; padding: 10px; border-radius: 10px; }
      </style>
    </head>
    <body>
      <h1>Cosmetic Compatibility Report</h1>
      <div class="muted">Generated: ${esc(new Date().toLocaleString())}</div>

      <div class="card">
        <p><strong>Product:</strong> ${esc(item.productName)}</p>
        <p><strong>Assessment ID:</strong> ${esc(item.assessment.assessmentId)}</p>
        <p><strong>Score:</strong> ${item.assessment.score}/100</p>
        <p><strong>Confidence:</strong> ${item.assessment.confidence.toFixed(2)}</p>
      </div>

      <div class="card">${section('Risk Flags', `<ul>${list(item.assessment.flags)}</ul>`)}</div>
      <div class="card">${section('Reasons', `<ul>${list(item.assessment.reasons)}</ul>`)}</div>
      <div class="card">${section('Precautions', `<ul>${list(item.assessment.precautions)}</ul>`)}</div>
      <div class="card">${section('Safer Alternatives', `<ul>${list(item.assessment.alternatives)}</ul>`)}</div>

      <div class="card">
        ${section(
          'User Profile',
          profile
            ? `<p><strong>Skin Type:</strong> ${esc(profile.skinType)}</p>
               <p><strong>Allergies:</strong> ${esc(profile.allergies.join(', ') || 'None')}</p>
               <p><strong>Conditions:</strong> ${esc(profile.conditions.join(', ') || 'None')}</p>
               <p><strong>Preferences:</strong> ${esc(profile.preferences.join(', ') || 'None')}</p>`
            : '<p>Not available</p>'
        )}
      </div>

      <div class="deferred">
        <p><strong>Deferred Modules:</strong> Blockchain verification layer, AI model layer, XAI trace engine.</p>
      </div>
    </body>
  </html>`;
}

export async function exportReportAsPdf(item: AssessmentHistoryItem, profile: UserProfile | null) {
  const html = reportHtml(item, profile);
  const file = await Print.printToFileAsync({ html });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Assessment PDF Report',
      UTI: 'com.adobe.pdf',
    });
  }

  return file.uri;
}
