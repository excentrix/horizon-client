import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { DailyTask } from "@/types";

interface EfficacyReportData {
  task: DailyTask;
  totalDurationMs: number;
  phaseDurationsMs: Record<number, number>; // 0: Learn, 1: Practice, 2: Prove
  proofType: string;
}

export function generateEfficacyReportPDF(data: EfficacyReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text("Learning Efficacy Report", 14, 25);

  // Subtitle / Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Generated on: ${format(new Date(), "PPp")}`, 14, 32);

  // Line Separator
  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(14, 36, pageWidth - 14, 36);

  // Task Details Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("Session Objective", 14, 48);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Task:", 14, 56);
  doc.setFont("helvetica", "normal");
  const splitTitle = doc.splitTextToSize(data.task.title, pageWidth - 40);
  doc.text(splitTitle, 30, 56);

  const descY = 56 + splitTitle.length * 5;
  doc.setFont("helvetica", "bold");
  doc.text("Description:", 14, descY);
  doc.setFont("helvetica", "normal");
  const splitDesc = doc.splitTextToSize(data.task.description || "N/A", pageWidth - 45);
  doc.text(splitDesc, 40, descY);

  // Analytics Section
  const tableY = descY + splitDesc.length * 5 + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Time-in-State Analytics", 14, tableY);

  const msToMin = (ms: number) => Math.max(0.1, (ms / 60000)).toFixed(1) + " min";
  const learnMin = msToMin(data.phaseDurationsMs[0] || 0);
  const practiceMin = msToMin(data.phaseDurationsMs[1] || 0);
  const proveMin = msToMin(data.phaseDurationsMs[2] || 0);
  const totalMin = msToMin(data.totalDurationMs || 0);

  autoTable(doc, {
    startY: tableY + 6,
    head: [["ALPP Phase", "Activity Type", "Duration", "Status"]],
    body: [
      ["Assess & Learn", "Content Consumption", learnMin, "Completed"],
      ["Practice", "Interactive Sandbox", practiceMin, "Completed"],
      ["Prove", `Verification (${data.proofType})`, proveMin, "Completed"],
    ],
    foot: [["Total Session Time", "", totalMin, ""]],
    theme: "grid",
    headStyles: { fillColor: [124, 58, 237], textColor: 255 }, // violet-600
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 5 },
  });

  // Footer / Final Remarks
  const currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("This document certifies the active engagement and completion of the listed module.", 14, currentY);

  doc.save(`Efficacy-Report-${data.task.id.slice(0, 6)}.pdf`);
}
