export const DEFAULT_QUOTATION_TEMPLATE_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body { font-family: "Segoe UI", Arial, sans-serif; color: #1f2937; margin: 0; padding: 32px; font-size: 13px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0057A8; padding-bottom: 16px; margin-bottom: 24px; }
      .business-name { font-size: 20px; font-weight: 700; color: #003a62; margin: 0 0 4px; }
      .muted { color: #64748b; }
      .quote-title { text-align: right; }
      .quote-title h1 { margin: 0; font-size: 22px; color: #0057A8; }
      .meta { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 24px; }
      .meta-block h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #00A651; margin: 0 0 6px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { background: #f1f5f9; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; padding: 8px; }
      td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
      .num { text-align: right; }
      .totals { margin-top: 16px; margin-left: auto; width: 280px; }
      .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
      .totals .grand { font-weight: 700; font-size: 15px; border-top: 2px solid #0057A8; padding-top: 8px; margin-top: 8px; }
      .notes { margin-top: 24px; padding: 12px; background: #f8fafc; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <p class="business-name">{{business.name}}</p>
        {{#if business.email}}<p class="muted">{{business.email}}</p>{{/if}}
        {{#if business.phone}}<p class="muted">{{business.phone}}</p>{{/if}}
        {{#if business.gstin}}<p class="muted">GSTIN {{business.gstin}}</p>{{/if}}
      </div>
      <div class="quote-title">
        <h1>QUOTATION</h1>
        <p class="muted">#{{quotation.quoteNumber}}</p>
      </div>
    </div>

    <div class="meta">
      <div class="meta-block">
        <h3>Bill To</h3>
        <p><strong>{{contact.name}}</strong></p>
        <p class="muted">{{contact.phone}}</p>
        {{#if contact.email}}<p class="muted">{{contact.email}}</p>{{/if}}
      </div>
      <div class="meta-block">
        <h3>Details</h3>
        <p class="muted">Status: {{quotation.status}}</p>
        {{#if quotation.expiresAt}}<p class="muted">Expires: {{quotation.expiresAt}}</p>{{/if}}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>HSN/SAC</th>
          <th class="num">Qty</th>
          <th class="num">Rate</th>
          <th class="num">GST %</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        {{#each lineItems}}
        <tr>
          <td>{{this.description}}</td>
          <td>{{this.hsnSacCode}}</td>
          <td class="num">{{this.quantity}}</td>
          <td class="num">{{this.rateFormatted}}</td>
          <td class="num">{{this.taxPercent}}%</td>
          <td class="num">{{this.lineTotalFormatted}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>

    <div class="totals">
      <div><span>Subtotal</span><span>{{subtotalFormatted}}</span></div>
      <div><span>GST</span><span>{{taxTotalFormatted}}</span></div>
      <div class="grand"><span>Total</span><span>{{grandTotalFormatted}}</span></div>
    </div>

    {{#if quotation.notes}}
    <div class="notes">
      <h3 class="muted">Notes</h3>
      <p>{{quotation.notes}}</p>
    </div>
    {{/if}}
  </body>
</html>
`;
