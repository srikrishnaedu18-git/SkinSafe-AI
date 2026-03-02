import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
function esc(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}
function list(items) {
    if (items.length === 0)
        return '<li>None</li>';
    return items.map((item) => `<li>${esc(item)}</li>`).join('');
}
function section(title, content) {
    return `<h3>${esc(title)}</h3><div>${content}</div>`;
}
function reportHtml(item, profile) {
    const flags = item.assessment.riskFlags.map((f) => `${f.code} [${f.severity}] ${f.ingredients.join(', ')}`.trim());
    const negatives = item.assessment.explanations.topNegativeDrivers.map((d) => `${d.ingredient}: ${d.reason} (penalty ${d.penalty})`);
    const positives = item.assessment.explanations.topPositiveDrivers.map((d) => `${d.ingredient}: ${d.reason} (boost ${d.boost})`);
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
      </style>
    </head>
    <body>
      <h1>Cosmetic Compatibility Report</h1>
      <div class="muted">Generated: ${esc(new Date().toLocaleString())}</div>

      <div class="card">
        <p><strong>Product:</strong> ${esc(item.productName)}</p>
        <p><strong>Assessment ID:</strong> ${esc(item.assessment.assessmentId)}</p>
        <p><strong>Score:</strong> ${item.assessment.suitabilityScore}/100</p>
        <p><strong>Confidence:</strong> ${item.assessment.confidence.value.toFixed(2)} (${esc(item.assessment.confidence.reason)})</p>
      </div>

      <div class="card">${section('Risk Flags', `<ul>${list(flags)}</ul>`)}</div>
      <div class="card">${section('XAI Summary', `<p>${esc(item.assessment.explanations.summary)}</p>`)}</div>
      <div class="card">${section('Top Negative Drivers', `<ul>${list(negatives)}</ul>`)}</div>
      <div class="card">${section('Top Positive Drivers', `<ul>${list(positives)}</ul>`)}</div>
      <div class="card">${section('Patch Test', `<ul>${list(item.assessment.guidance.patchTest)}</ul>`)}</div>
      <div class="card">${section('Usage Guidance', `<ul>${list(item.assessment.guidance.usage)}</ul>`)}</div>
      <div class="card">${section('Avoid If', `<ul>${list(item.assessment.guidance.avoidIf)}</ul>`)}</div>
      <div class="card">${section('Alternatives', `<ul>${list(item.assessment.alternatives.map((a) => `${a.name}: ${a.whyBetter}`))}</ul>`)}</div>

      <div class="card">
        ${section('User Profile', profile
        ? `<p><strong>Skin Type:</strong> ${esc(profile.skinType)}</p>
               <p><strong>Allergies:</strong> ${esc(profile.allergies.join(', ') || 'None')}</p>
               <p><strong>Conditions:</strong> ${esc(profile.conditions.join(', ') || 'None')}</p>
               <p><strong>Preferences:</strong> ${esc(profile.preferences.join(', ') || 'None')}</p>`
        : '<p>Not available</p>')}
      </div>
    </body>
  </html>`;
}
export async function exportReportAsPdf(item, profile) {
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
