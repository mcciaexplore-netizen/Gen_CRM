import { Injectable, OnModuleDestroy } from "@nestjs/common";
import puppeteer, { Browser } from "puppeteer";

@Injectable()
export class HtmlPdfService implements OnModuleDestroy {
  private browserPromise: Promise<Browser> | null = null;

  async render(html: string, retrying = false): Promise<Buffer> {
    let browser: Browser;
    try {
      browser = await this.browser();
    } catch (error) {
      if (retrying) throw error;
      this.browserPromise = null;
      return this.render(html, true);
    }

    let page;
    try {
      page = await browser.newPage();
    } catch (error) {
      if (retrying) throw error;
      this.browserPromise = null;
      return this.render(html, true);
    }

    try {
      await page.setContent(html, { waitUntil: "load" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  async onModuleDestroy() {
    if (!this.browserPromise) return;
    const browser = await this.browserPromise;
    await browser.close();
  }

  private async browser(): Promise<Browser> {
    if (this.browserPromise) {
      const existing = await this.browserPromise;
      if (existing.connected) return existing;
      this.browserPromise = null;
    }
    this.browserPromise = puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    return this.browserPromise;
  }
}
