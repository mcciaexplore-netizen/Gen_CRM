import { Injectable } from "@nestjs/common";
import type {
  InvoiceLineItem,
  InvoiceStatus,
  PaymentSummary,
} from "@msme-crm/shared-types";
import PDFDocument from "pdfkit";

export interface InvoicePdfData {
  businessName: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  issuedAt: string | null;
  createdAt: string;
  dueDate: string;
  contact: {
    name: string;
    phone: string;
    email: string | null;
  };
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  payments: PaymentSummary[];
  irn: string | null;
  qrCodeUrl: string | null;
}

@Injectable()
export class InvoicePdfService {
  generate(invoice: InvoicePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({
        size: "A4",
        margin: 40,
        bufferPages: true,
        info: {
          Title: "Invoice " + (invoice.invoiceNumber ?? "Draft"),
          Author: invoice.businessName,
          Subject: "GST invoice",
        },
      });
      const chunks: Buffer[] = [];
      document.on("data", (chunk: Buffer) => chunks.push(chunk));
      document.on("error", reject);
      document.on("end", () => resolve(Buffer.concat(chunks)));

      this.drawHeader(document, invoice);
      let y = this.drawCustomer(document, invoice);
      y = this.drawTableHeader(document, y + 18);

      invoice.lineItems.forEach((item, index) => {
        const rowHeight = Math.max(
          30,
          document.heightOfString(item.description, { width: 165 }) + 14,
        );
        if (y + rowHeight > 720) {
          document.addPage();
          y = this.drawTableHeader(document, 48);
        }
        this.drawLineItem(document, item, index + 1, y, rowHeight);
        y += rowHeight;
      });

      if (y > 610) {
        document.addPage();
        y = 50;
      }
      y = this.drawTotals(document, invoice, y + 18);
      this.drawCompliance(document, invoice, y + 18);
      this.drawFooters(document);
      document.end();
    });
  }

  private drawHeader(document: PDFKit.PDFDocument, invoice: InvoicePdfData) {
    document.save().rect(0, 0, 595.28, 126).fill("#064e3b").restore();
    document
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text(invoice.businessName, 40, 30, { width: 315, height: 52 });
    document
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#d1fae5")
      .text("GST TAX INVOICE", 40, 94);
    document
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor("#ffffff")
      .text(invoice.invoiceNumber ?? "DRAFT", 380, 34, {
        align: "right",
        width: 175,
      });
    document
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#d1fae5")
      .text(invoice.status.toUpperCase(), 380, 62, {
        align: "right",
        width: 175,
      });
  }

  private drawCustomer(document: PDFKit.PDFDocument, invoice: InvoicePdfData) {
    const y = 150;
    document
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#64748b")
      .text("BILL TO", 40, y);
    document
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#0f172a")
      .text(invoice.contact.name, 40, y + 17, { width: 280 });
    document
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#475569")
      .text(invoice.contact.phone, 40, y + 38)
      .text(invoice.contact.email ?? "", 40, y + 53);

    const issueDate = invoice.issuedAt ?? invoice.createdAt;
    this.labelValue(document, "Invoice date", this.date(issueDate), 368, y);
    this.labelValue(
      document,
      "Due date",
      this.date(invoice.dueDate),
      368,
      y + 34,
    );
    return y + 72;
  }

  private drawTableHeader(document: PDFKit.PDFDocument, y: number) {
    document.save().rect(40, y, 515, 26).fill("#e2e8f0").restore();
    const headings = [
      ["#", 45, 22, "left"],
      ["Description", 67, 165, "left"],
      ["HSN/SAC", 232, 64, "left"],
      ["Qty", 296, 42, "right"],
      ["Rate", 338, 75, "right"],
      ["GST", 413, 52, "right"],
      ["Amount", 465, 84, "right"],
    ] as const;
    document.font("Helvetica-Bold").fontSize(8).fillColor("#334155");
    headings.forEach(([text, x, width, align]) =>
      document.text(text, x, y + 9, { width, align }),
    );
    return y + 26;
  }

  private drawLineItem(
    document: PDFKit.PDFDocument,
    item: InvoiceLineItem,
    index: number,
    y: number,
    height: number,
  ) {
    const base = item.quantity * item.rate;
    const total = base + (base * item.taxPercent) / 100;
    if (index % 2 === 0) {
      document.save().rect(40, y, 515, height).fill("#f8fafc").restore();
    }
    document.font("Helvetica").fontSize(8.5).fillColor("#0f172a");
    document.text(String(index), 45, y + 9, { width: 22 });
    document.text(item.description, 67, y + 9, { width: 160 });
    document.text(item.hsnSacCode, 232, y + 9, { width: 60 });
    document.text(this.number(item.quantity), 296, y + 9, {
      width: 38,
      align: "right",
    });
    document.text(this.money(item.rate), 338, y + 9, {
      width: 71,
      align: "right",
    });
    document.text(this.number(item.taxPercent) + "%", 413, y + 9, {
      width: 48,
      align: "right",
    });
    document.text(this.money(total), 465, y + 9, {
      width: 84,
      align: "right",
    });
    document
      .save()
      .moveTo(40, y + height)
      .lineTo(555, y + height)
      .strokeColor("#e2e8f0")
      .stroke()
      .restore();
  }

  private drawTotals(
    document: PDFKit.PDFDocument,
    invoice: InvoicePdfData,
    y: number,
  ) {
    const x = 345;
    const rows: Array<[string, number, boolean?]> = [
      ["Subtotal", invoice.subtotal],
      ["GST", invoice.taxTotal],
      ["Grand total", invoice.grandTotal, true],
      ["Paid", invoice.amountPaid],
      ["Balance due", invoice.balanceDue, true],
    ];
    rows.forEach(([label, value, strong], index) => {
      const rowY = y + index * 24;
      document
        .font(strong ? "Helvetica-Bold" : "Helvetica")
        .fontSize(strong ? 10.5 : 9)
        .fillColor(strong ? "#064e3b" : "#475569")
        .text(label, x, rowY, { width: 100 });
      document.text("INR " + this.money(value), x + 100, rowY, {
        width: 110,
        align: "right",
      });
    });
    return y + rows.length * 24;
  }

  private drawCompliance(
    document: PDFKit.PDFDocument,
    invoice: InvoicePdfData,
    y: number,
  ) {
    if (!invoice.irn && !invoice.qrCodeUrl) return;
    if (y > 700) {
      document.addPage();
      y = 50;
    }
    document
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#334155")
      .text("E-INVOICE DETAILS", 40, y);
    document
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor("#475569")
      .text("IRN: " + (invoice.irn ?? "Pending"), 40, y + 17, { width: 515 });
    if (invoice.qrCodeUrl) {
      document.text("Verification: " + invoice.qrCodeUrl, 40, y + 39, {
        width: 515,
        link: invoice.qrCodeUrl,
        underline: true,
      });
    }
  }

  private drawFooters(document: PDFKit.PDFDocument) {
    const range = document.bufferedPageRange();
    for (
      let index = range.start;
      index < range.start + range.count;
      index += 1
    ) {
      document.switchToPage(index);
      document
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#64748b")
        .text(
          "Generated by SahayakCRM | Page " +
            (index - range.start + 1) +
            " of " +
            range.count,
          40,
          790,
          { align: "center", width: 515, lineBreak: false },
        );
    }
  }

  private labelValue(
    document: PDFKit.PDFDocument,
    label: string,
    value: string,
    x: number,
    y: number,
  ) {
    document
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#64748b")
      .text(label, x, y, {
        width: 85,
      });
    document
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#0f172a")
      .text(value, x + 85, y, {
        align: "right",
        width: 102,
      });
  }

  private date(value: string) {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(new Date(value));
  }

  private money(value: number) {
    return value.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private number(value: number) {
    return value.toLocaleString("en-IN", { maximumFractionDigits: 3 });
  }
}
