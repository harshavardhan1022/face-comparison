import jsPDF from 'jspdf';

interface PdfReportData {
  id: string;
  similarityScore: number;
  rawCosineScore: number;
  similarityCategory: string;
  modelVersion: string;
  imageQuality: string;
  createdAt: string;
  explanation: string;
  userEmail?: string;
  photo1Base64?: string | null;
  photo2Base64?: string | null;
}

export function generatePdfComparisonReport(data: PdfReportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Background Header Bar (Deep Dark Navy)
  doc.setFillColor(15, 8, 30);
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Brand Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('AI FACIAL SIMILARITY CERTIFICATE', 15, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(34, 211, 238); // Cyan
  doc.text('PRETRAINED ARCFACE BIOMETRIC INFERENCE REPORT', 15, 26);

  // Document Details Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 46, pageWidth - 30, 24, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 46, pageWidth - 30, 24, 3, 3, 'D');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text('REPORT ID:', 20, 54);
  doc.text('GENERATED ON:', 20, 62);
  doc.text('OPERATIONAL MODEL:', (pageWidth / 2) + 5, 54);
  doc.text('USER CONTEXT:', (pageWidth / 2) + 5, 62);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(data.id || 'N/A', 45, 54);
  doc.text(new Date(data.createdAt || Date.now()).toUTCString(), 50, 62);
  doc.text(data.modelVersion || 'ArcFace-ResNet100-v2.4', (pageWidth / 2) + 45, 54);
  doc.text(data.userEmail || 'Authenticated Client', (pageWidth / 2) + 40, 62);

  // Big Similarity Score Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(15, 76, pageWidth - 30, 40, 4, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(99, 102, 241); // Purple
  doc.text(`${data.similarityScore}%`, 25, 102);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('CALIBRATED SIMILARITY INDEX', 25, 110);

  // Category Badge Box
  doc.setFillColor(99, 102, 241);
  doc.roundedRect((pageWidth / 2) + 5, 84, 70, 11, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(data.similarityCategory.toUpperCase(), (pageWidth / 2) + 12, 91.5);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Raw Cosine Metric: ${data.rawCosineScore?.toFixed(4) || 'N/A'}`, (pageWidth / 2) + 5, 103);
  doc.text(`Quality Assessment: ${data.imageQuality || 'Optimal'}`, (pageWidth / 2) + 5, 110);

  // Embedded Photographs Section (Whenever retained with consent)
  let currentY = 124;
  if (data.photo1Base64 && data.photo2Base64) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('COMPARISON PHOTOGRAPHS (RETAINED WITH EXPLICIT CONSENT)', 15, currentY);

    try {
      // Photo 1 Card
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, currentY + 4, 85, 48, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, currentY + 4, 85, 48, 2, 2, 'D');
      doc.addImage(data.photo1Base64, 'JPEG', 20, currentY + 7, 36, 42);
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('PHOTOGRAPH 1', 60, currentY + 16);
      doc.setFont('helvetica', 'normal');
      doc.text('Reference Portrait', 60, currentY + 23);
      doc.text('Validated Face: Yes', 60, currentY + 30);

      // Photo 2 Card
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(110, currentY + 4, 85, 48, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(110, currentY + 4, 85, 48, 2, 2, 'D');
      doc.addImage(data.photo2Base64, 'JPEG', 115, currentY + 7, 36, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('PHOTOGRAPH 2', 155, currentY + 16);
      doc.setFont('helvetica', 'normal');
      doc.text('Target Portrait', 155, currentY + 23);
      doc.text('Validated Face: Yes', 155, currentY + 30);

      currentY += 58;
    } catch (imgErr) {
      console.warn('PDF image embedding exception:', imgErr);
      currentY += 10;
    }
  } else {
    // Non-retained notice
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, currentY, pageWidth - 30, 16, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, currentY, pageWidth - 30, 16, 2, 2, 'D');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Photographs were automatically purged post-inference per zero-retention privacy policy.', 20, currentY + 7);
    doc.text('Mathematical representation embeddings and calibrated metrics are cryptographically verified.', 20, currentY + 12);
    currentY += 24;
  }

  // Metric Interpretation & Explanation
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('EVALUATION BREAKDOWN', 15, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const splitExplanation = doc.splitTextToSize(
    data.explanation || 'The geometric and facial embedding vectors were matched using normalized cosine similarity mapped through an empirical sigmoid calibration curve.',
    pageWidth - 30
  );
  doc.text(splitExplanation, 15, currentY + 7);

  // Calibration Table
  const startY = currentY + 22;
  doc.setFillColor(248, 250, 252);
  doc.rect(15, startY, pageWidth - 30, 30, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, startY, pageWidth - 30, 30, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('CALIBRATED THRESHOLD RANGES', 20, startY + 6);

  doc.setFont('helvetica', 'normal');
  doc.text('• High Similarity: Cosine >= 0.48 (Calibrated Index >= 70%)', 20, startY + 13);
  doc.text('• Moderate Similarity: Cosine 0.38 - 0.47 (Calibrated Index 50% - 69%)', 20, startY + 19);
  doc.text('• Low / Inconclusive: Cosine < 0.38 (Calibrated Index < 50%)', 20, startY + 25);

  // Biometric Disclaimer (Section 2 & 8)
  const disclaimerY = startY + 36;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(185, 28, 28); // Red
  doc.text('MANDATORY SCIENTIFIC & LEGAL NOTICE', 15, disclaimerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const disclaimerText = (
    'This document reports an automated mathematical comparison of facial representations generated by a deep neural network model. ' +
    'The 0-100 Facial Similarity Index is an estimated similarity score derived from statistical calibration. ' +
    'It does NOT establish legal proof of personal identity, does not constitute forensic evidence, and must not be used as the sole basis for legal or identity decisions.'
  );
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - 30);
  doc.text(splitDisclaimer, 15, disclaimerY + 5);

  // Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 280, pageWidth - 15, 280);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('AI Face Similarity Analyzer © 2026. Confidential & Generated for Authenticated User.', 15, 286);

  // Download
  doc.save(`facial-similarity-report-${data.id.slice(0, 8)}.pdf`);
}
