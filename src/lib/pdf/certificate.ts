import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import type { Certificate } from "@/types/certificate";
import type { OrgSettings } from "@/types/settings";
import { formatHours, formatLongDate, formatShortDate } from "@/lib/dates";

const PAGE = { width: 612, height: 792, margin: 56 };
const MAGENTA = rgb(0.957, 0, 0.957);
const INK = rgb(0.102, 0.075, 0.125);
const MUTED = rgb(0.463, 0.42, 0.486);
const RULE = rgb(0.902, 0.878, 0.91);

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

/**
 * Renders a certificate PDF from its frozen snapshot. Nothing here reads live
 * data, so a certificate issued years ago renders exactly as it did then.
 * Written to satisfy the "signed letter on letterhead" format that Georgia
 * schools and scholarship programs expect.
 */
export async function renderCertificatePdf(
  certificate: Certificate,
  settings: Pick<
    OrgSettings,
    "orgName" | "addressLine1" | "addressLine2" | "phone" | "email" | "website"
  >,
  verifyUrl: string
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(
    `${settings.orgName} – Volunteer ${certificate.type === "event" ? "Certificate" : "Service Record"}`
  );
  pdf.setAuthor(settings.orgName);

  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };

  const qrPng = await QRCode.toBuffer(verifyUrl, {
    margin: 0,
    width: 240,
    color: { dark: "#1A1320" },
  });
  const qrImage = await pdf.embedPng(qrPng);

  let page = addPage(pdf, fonts, settings);
  let y = PAGE.height - 150;

  const isEvent = certificate.type === "event";
  page.drawText(
    isEvent ? "CERTIFICATE OF VOLUNTEER SERVICE" : "VOLUNTEER SERVICE RECORD",
    {
      x: PAGE.margin,
      y,
      size: 11,
      font: fonts.bold,
      color: MAGENTA,
    }
  );
  y -= 30;
  page.drawText(certificate.volunteerName, {
    x: PAGE.margin,
    y,
    size: 26,
    font: fonts.bold,
    color: INK,
  });
  y -= 22;
  const period =
    formatShortDate(certificate.periodStart) ===
    formatShortDate(certificate.periodEnd)
      ? formatShortDate(certificate.periodStart)
      : `${formatShortDate(certificate.periodStart)} to ${formatShortDate(certificate.periodEnd)}`;
  page.drawText(
    `${formatHours(certificate.totalHours)} of approved volunteer service · ${period}`,
    { x: PAGE.margin, y, size: 11, font: fonts.regular, color: MUTED }
  );
  y -= 34;

  const intro = isEvent
    ? `This certifies that ${certificate.volunteerName} volunteered with ${settings.orgName} at ${certificate.items[0]?.eventTitle ?? "a Pink STEM event"} on ${formatLongDate(certificate.periodStart)}, serving as ${certificate.items[0]?.roleName ?? "a volunteer"} for ${formatHours(certificate.totalHours)}.`
    : `This letter confirms that ${certificate.volunteerName} completed ${formatHours(certificate.totalHours)} of volunteer service with ${settings.orgName} between ${formatLongDate(certificate.periodStart)} and ${formatLongDate(certificate.periodEnd)}. The events, dates, and hours are itemized below.`;
  y = drawParagraph(page, fonts.regular, intro, y, 11, 16);
  y -= 6;
  y = drawParagraph(
    page,
    fonts.regular,
    "Hours were recorded by the organizer of each event and approved before entering the volunteer's service ledger. Volunteers do not self-report hours.",
    y,
    10,
    14,
    MUTED
  );
  y -= 18;

  if (!isEvent || certificate.items.length > 1) {
    ({ page, y } = drawTable(pdf, page, fonts, settings, certificate, y));
    y -= 10;
  }

  if (y < 250) {
    page = addPage(pdf, fonts, settings);
    y = PAGE.height - 130;
  }

  // Signature block
  y -= 30;
  page.drawLine({
    start: { x: PAGE.margin, y },
    end: { x: PAGE.margin + 220, y },
    thickness: 0.8,
    color: INK,
  });
  y -= 14;
  page.drawText(certificate.signatoryName, {
    x: PAGE.margin,
    y,
    size: 11,
    font: fonts.bold,
    color: INK,
  });
  y -= 14;
  page.drawText(`${certificate.signatoryTitle}, ${settings.orgName}`, {
    x: PAGE.margin,
    y,
    size: 10,
    font: fonts.regular,
    color: MUTED,
  });
  y -= 14;
  page.drawText(`${settings.phone} · ${settings.email}`, {
    x: PAGE.margin,
    y,
    size: 10,
    font: fonts.regular,
    color: MUTED,
  });
  y -= 14;
  page.drawText(`Issued ${formatLongDate(certificate.issuedAt)}`, {
    x: PAGE.margin,
    y,
    size: 10,
    font: fonts.regular,
    color: MUTED,
  });

  // Verification block, right-aligned on the same band
  const qrSize = 84;
  const qrX = PAGE.width - PAGE.margin - qrSize;
  const qrY = y - 4;
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  const labelX = qrX - 170;
  page.drawText("VERIFY THIS DOCUMENT", {
    x: labelX,
    y: qrY + qrSize - 10,
    size: 8,
    font: fonts.bold,
    color: MAGENTA,
  });
  page.drawText(certificate.verificationCode, {
    x: labelX,
    y: qrY + qrSize - 28,
    size: 12,
    font: fonts.bold,
    color: INK,
  });
  drawParagraph(
    page,
    fonts.regular,
    verifyUrl,
    qrY + qrSize - 44,
    8,
    11,
    MUTED,
    160,
    labelX
  );
  drawParagraph(
    page,
    fonts.regular,
    "Scan the code or open the link to confirm this record is genuine and unrevoked.",
    qrY + qrSize - 68,
    8,
    11,
    MUTED,
    160,
    labelX
  );

  return pdf.save();
}

function addPage(
  pdf: PDFDocument,
  fonts: Fonts,
  settings: Pick<
    OrgSettings,
    "orgName" | "addressLine1" | "addressLine2" | "phone" | "email" | "website"
  >
): PDFPage {
  const page = pdf.addPage([PAGE.width, PAGE.height]);
  page.drawRectangle({
    x: 0,
    y: PAGE.height - 10,
    width: PAGE.width,
    height: 10,
    color: MAGENTA,
  });
  page.drawText(settings.orgName.toUpperCase(), {
    x: PAGE.margin,
    y: PAGE.height - 52,
    size: 13,
    font: fonts.bold,
    color: INK,
  });
  page.drawText("Breaking barriers for girls in STEM", {
    x: PAGE.margin,
    y: PAGE.height - 68,
    size: 9,
    font: fonts.regular,
    color: MUTED,
  });
  const address = [
    settings.addressLine1,
    settings.addressLine2,
    `${settings.phone} · ${settings.website}`,
  ];
  address.forEach((line, i) => {
    const width = fonts.regular.widthOfTextAtSize(line, 8.5);
    page.drawText(line, {
      x: PAGE.width - PAGE.margin - width,
      y: PAGE.height - 48 - i * 11,
      size: 8.5,
      font: fonts.regular,
      color: MUTED,
    });
  });
  page.drawLine({
    start: { x: PAGE.margin, y: PAGE.height - 88 },
    end: { x: PAGE.width - PAGE.margin, y: PAGE.height - 88 },
    thickness: 0.8,
    color: RULE,
  });
  return page;
}

function drawParagraph(
  page: PDFPage,
  font: PDFFont,
  text: string,
  y: number,
  size: number,
  lineHeight: number,
  color = INK,
  maxWidth = PAGE.width - PAGE.margin * 2,
  x = PAGE.margin
): number {
  // Break tokens wider than the column (URLs) so nothing overflows.
  const fits = (t: string) => font.widthOfTextAtSize(t, size) <= maxWidth;
  const words = text.split(/\s+/).flatMap((word) => {
    const parts: string[] = [];
    let rest = word;
    while (!fits(rest)) {
      let cut = rest.length - 1;
      while (cut > 1 && !fits(rest.slice(0, cut))) cut -= 1;
      parts.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    return [...parts, rest];
  });
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      page.drawText(line, { x, y, size, font, color });
      y -= lineHeight;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    page.drawText(line, { x, y, size, font, color });
    y -= lineHeight;
  }
  return y;
}

function drawTable(
  pdf: PDFDocument,
  page: PDFPage,
  fonts: Fonts,
  settings: Pick<
    OrgSettings,
    "orgName" | "addressLine1" | "addressLine2" | "phone" | "email" | "website"
  >,
  certificate: Certificate,
  y: number
): { page: PDFPage; y: number } {
  const columns = [
    { label: "Date", x: PAGE.margin, width: 90 },
    { label: "Event", x: PAGE.margin + 96, width: 220 },
    { label: "Role", x: PAGE.margin + 322, width: 120 },
    { label: "Hours", x: PAGE.width - PAGE.margin - 40, width: 40 },
  ];
  const header = () => {
    columns.forEach((c) =>
      page.drawText(c.label.toUpperCase(), {
        x: c.x,
        y,
        size: 8,
        font: fonts.bold,
        color: MUTED,
      })
    );
    y -= 8;
    page.drawLine({
      start: { x: PAGE.margin, y },
      end: { x: PAGE.width - PAGE.margin, y },
      thickness: 0.8,
      color: RULE,
    });
    y -= 14;
  };
  const truncate = (text: string, width: number) => {
    let t = text;
    while (fonts.regular.widthOfTextAtSize(t, 10) > width && t.length > 3)
      t = `${t.slice(0, -2).trimEnd()}…`;
    return t;
  };

  header();
  for (const item of certificate.items) {
    if (y < 120) {
      page = addPage(pdf, fonts, settings);
      y = PAGE.height - 120;
      header();
    }
    page.drawText(formatShortDate(item.eventDate), {
      x: columns[0].x,
      y,
      size: 10,
      font: fonts.regular,
      color: INK,
    });
    page.drawText(truncate(item.eventTitle, columns[1].width), {
      x: columns[1].x,
      y,
      size: 10,
      font: fonts.regular,
      color: INK,
    });
    page.drawText(truncate(item.roleName, columns[2].width), {
      x: columns[2].x,
      y,
      size: 10,
      font: fonts.regular,
      color: INK,
    });
    const hours = formatHours(item.hours).replace(" hr", "");
    page.drawText(hours, {
      x:
        columns[3].x +
        columns[3].width -
        fonts.regular.widthOfTextAtSize(hours, 10),
      y,
      size: 10,
      font: fonts.regular,
      color: INK,
    });
    y -= 16;
  }
  page.drawLine({
    start: { x: PAGE.margin, y: y + 6 },
    end: { x: PAGE.width - PAGE.margin, y: y + 6 },
    thickness: 0.8,
    color: RULE,
  });
  y -= 8;
  const total = formatHours(certificate.totalHours).replace(" hr", "");
  page.drawText("Total approved hours", {
    x: columns[2].x,
    y,
    size: 10,
    font: fonts.bold,
    color: INK,
  });
  page.drawText(total, {
    x:
      columns[3].x + columns[3].width - fonts.bold.widthOfTextAtSize(total, 10),
    y,
    size: 10,
    font: fonts.bold,
    color: INK,
  });
  y -= 16;
  return { page, y };
}
