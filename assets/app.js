const app = {
  checklist: [],
  currentStep: 1,
  property: createDefaultProperty(),
  responses: {},
  pdfUrl: "",
  isGeneratingPdf: false
};

const assessmentLabels = {
  pass: "Appears compliant",
  fail: "Needs review",
  na: "Not applicable",
  professional: "Professional check recommended"
};
const assessmentOptions = ["pass", "fail", "na", "professional"];
const questionOptions = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "Unsure" }
];
const rentalStages = [
  "Preparing to advertise",
  "Before renter moves in",
  "Renewal check",
  "Routine inspection"
];
const disclaimer =
  "This checklist is a self-assessment tool only and does not constitute legal advice. Landlords should refer to Consumer Affairs Victoria and seek professional advice where required.";

const nodes = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheNodes();
  attachStaticListeners();
  nodes.screen.innerHTML = '<div class="loading">Loading checklist...</div>';

  try {
    app.checklist = await loadChecklist();
    app.responses = createInitialResponses(app.checklist);
    render();
  } catch (error) {
    nodes.screen.innerHTML = `
      <div class="error">
        <strong>Checklist could not be loaded.</strong>
        <p>${escapeHtml(error.message || "Please host the files through GitHub Pages or a small local web server.")}</p>
      </div>
    `;
  }
}

async function loadChecklist() {
  if (Array.isArray(window.RENTAL_CHECKLIST_DATA)) {
    return window.RENTAL_CHECKLIST_DATA;
  }

  const response = await fetch("data/checklist.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Checklist could not be loaded.");
  }

  return response.json();
}

function cacheNodes() {
  nodes.stepTitle = document.getElementById("step-title");
  nodes.stepCount = document.getElementById("step-count");
  nodes.sectionCount = document.getElementById("section-count");
  nodes.progressFill = document.getElementById("progress-fill");
  nodes.screen = document.getElementById("app-screen");
  nodes.backButton = document.getElementById("back-button");
  nodes.nextButton = document.getElementById("next-button");
}

function attachStaticListeners() {
  nodes.backButton.addEventListener("click", () => goToStep(app.currentStep - 1));
  nodes.nextButton.addEventListener("click", () => {
    if (app.currentStep === totalSteps()) {
      resetApp();
      return;
    }
    goToStep(app.currentStep + 1);
  });
}

function render() {
  renderHeader();

  if (app.currentStep === 1) {
    renderPropertyDetails();
  } else if (app.currentStep === totalSteps()) {
    renderSummary();
  } else {
    renderChecklistStep(app.checklist[app.currentStep - 2]);
  }

  nodes.backButton.disabled = app.currentStep === 1;
  nodes.nextButton.textContent =
    app.currentStep === totalSteps() ? "Reset" : "Continue";
}

function renderHeader() {
  const total = totalSteps();
  const progress = Math.round((app.currentStep / total) * 100);
  const completed = app.checklist.filter(
    (section) => app.responses[section.id] && app.responses[section.id].assessment
  ).length;

  nodes.stepTitle.textContent = currentTitle();
  nodes.stepCount.textContent = `Step ${app.currentStep} of ${total}`;
  nodes.sectionCount.textContent = `${completed}/${app.checklist.length} sections assessed`;
  nodes.progressFill.style.width = `${progress}%`;
}

function renderPropertyDetails() {
  nodes.screen.innerHTML = `
    <section class="screen-stack">
      <div class="panel">
        <h2 class="panel-title">Property details</h2>
        <p class="panel-subtitle">These details appear on the PDF report.</p>
        <div class="form-grid">
          <label class="field">
            <span>Property address</span>
            <textarea id="property-address" rows="3" placeholder="Unit 1, 100 Example Street, Melbourne VIC">${escapeHtml(app.property.propertyAddress)}</textarea>
          </label>
          <label class="field">
            <span>Landlord / property manager name</span>
            <input id="landlord-name" value="${escapeAttribute(app.property.landlordName)}" placeholder="Name" />
          </label>
          <label class="field">
            <span>Inspector name</span>
            <input id="inspector-name" value="${escapeAttribute(app.property.inspectorName)}" placeholder="Name" />
          </label>
          <label class="field">
            <span>Inspection date</span>
            <input id="inspection-date" type="date" value="${escapeAttribute(app.property.inspectionDate)}" />
          </label>
          <label class="field">
            <span>Rental stage</span>
            <select id="rental-stage">
              ${rentalStages
                .map(
                  (stage) =>
                    `<option value="${escapeAttribute(stage)}" ${app.property.rentalStage === stage ? "selected" : ""}>${escapeHtml(stage)}</option>`
                )
                .join("")}
            </select>
          </label>
        </div>
      </div>
    </section>
  `;

  bindPropertyField("property-address", "propertyAddress");
  bindPropertyField("landlord-name", "landlordName");
  bindPropertyField("inspector-name", "inspectorName");
  bindPropertyField("inspection-date", "inspectionDate");
  bindPropertyField("rental-stage", "rentalStage");
}

function renderChecklistStep(section) {
  const response = app.responses[section.id];
  nodes.screen.innerHTML = `
    <section class="screen-stack">
      <div class="panel">
        <h2 class="panel-title">${escapeHtml(section.title)}</h2>
        <p class="panel-subtitle">Minimum standard self-check</p>
        <div class="screen-stack">
          <div class="info-block">
            <span class="eyebrow">Minimum standard</span>
            <p>${escapeHtml(section.officialRequirement)}</p>
          </div>
          <div class="info-block">
            <span class="eyebrow">Consumer Affairs Victoria guidance summary</span>
            <p>${escapeHtml(section.cavExplanation)}</p>
          </div>
          <div class="info-block warning">
            <span class="eyebrow">Common issues</span>
            <ul class="issue-list">
              ${section.commonIssues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}
            </ul>
          </div>
        </div>
      </div>

      <div class="panel">
        <h3 class="panel-title">Self-check questions</h3>
        <div class="question-list">
          ${section.selfCheckQuestions
            .map((question, index) => renderQuestion(section.id, response, question, index))
            .join("")}
        </div>
      </div>

      <div class="panel">
        <h3 class="panel-title">Assessment</h3>
        <div class="choice-grid" role="group" aria-label="Assessment">
          ${assessmentOptions
            .map((option) => {
              const selected = response.assessment === option ? "selected" : "";
              return `<button class="choice ${option} ${selected}" data-assessment="${option}" type="button">${assessmentLabels[option]}</button>`;
            })
            .join("")}
        </div>
      </div>

      <div class="panel">
        <h3 class="panel-title">Notes</h3>
        <label class="field">
          <span>Notes</span>
          <textarea id="notes" rows="4" placeholder="Record observations, room names, fixture details or uncertainty.">${escapeHtml(response.notes)}</textarea>
        </label>
      </div>
    </section>
  `;

  nodes.screen.querySelectorAll("[data-question-index][data-answer]").forEach((button) => {
    button.addEventListener("click", () => {
      response.questionAnswers[button.dataset.questionIndex] = button.dataset.answer;
      render();
    });
  });
  nodes.screen.querySelectorAll("[data-assessment]").forEach((button) => {
    button.addEventListener("click", () => {
      response.assessment = button.dataset.assessment;
      render();
    });
  });
  document.getElementById("notes").addEventListener("input", (event) => {
    response.notes = event.target.value;
  });
}

function renderQuestion(sectionId, response, question, index) {
  return `
    <div class="question-card">
      <p>${escapeHtml(question)}</p>
      <div class="choice-row" role="group" aria-label="${escapeAttribute(question)}">
        ${questionOptions
          .map((option) => {
            const selected = response.questionAnswers[String(index)] === option.value ? "selected" : "";
            return `<button class="choice ${selected}" data-section-id="${sectionId}" data-question-index="${index}" data-answer="${option.value}" type="button">${option.label}</button>`;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderSummary() {
  const summary = calculateSummary();
  const resultClass =
    summary.overallResult === "Not ready"
      ? "not-ready"
      : summary.overallResult === "Ready after minor fixes"
        ? "minor"
        : "ready";

  nodes.screen.innerHTML = `
    <section class="screen-stack">
      <div class="summary-result ${resultClass}">
        <p><strong>Overall result</strong></p>
        <h2>${summary.overallResult}</h2>
        <p>Self-assessment only. This result is not legal certification and does not determine compliance.</p>
      </div>

      <div class="metric-grid">
        ${renderMetric("Appears compliant", summary.passedCount)}
        ${renderMetric("Needs review", summary.failedCount)}
        ${renderMetric("Professional check", summary.needsProfessionalCount)}
        ${renderMetric("Unanswered", summary.unansweredCount)}
      </div>

      <div class="panel">
        <h3 class="panel-title">Property details</h3>
        <dl class="detail-list">
          ${renderDetail("Address", app.property.propertyAddress || "Not provided")}
          ${renderDetail("Landlord / manager", app.property.landlordName || "Not provided")}
          ${renderDetail("Inspector", app.property.inspectorName || "Not provided")}
          ${renderDetail("Inspection date", app.property.inspectionDate || "Not provided")}
          ${renderDetail("Rental stage", app.property.rentalStage)}
        </dl>
      </div>

      <div class="panel">
        <h3 class="panel-title">Items needing review</h3>
        ${
          summary.reviewItems.length
            ? `<div class="review-list">${summary.reviewItems.map(renderReviewItem).join("")}</div>`
            : `<p class="panel-subtitle">No review items have been recorded.</p>`
        }
      </div>

      <div class="panel">
        <h3 class="panel-title">Checklist snapshot</h3>
        <div class="snapshot-list">
          ${app.checklist.map(renderSnapshotItem).join("")}
        </div>
      </div>

      <div class="panel">
        <h3 class="panel-title">PDF report</h3>
        <p class="panel-subtitle">Generate a printable report with notes, checklist results and signature area.</p>
        <div class="pdf-actions">
          <button class="button button-primary" id="generate-pdf" type="button">${app.isGeneratingPdf ? "Generating..." : "Generate PDF"}</button>
          <button class="button button-dark" id="download-pdf" type="button">Download PDF</button>
        </div>
        ${app.pdfUrl ? `<a class="pdf-link" href="${app.pdfUrl}" target="_blank" rel="noreferrer">Open printable PDF</a>` : ""}
      </div>
    </section>
  `;

  document.getElementById("generate-pdf").addEventListener("click", buildPdf);
  document.getElementById("download-pdf").addEventListener("click", downloadPdf);
}

function renderMetric(label, value) {
  return `
    <div class="metric">
      <strong>${value}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function renderDetail(label, value) {
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
  `;
}

function renderReviewItem(item) {
  return `
    <article class="review-item">
      <h4>${escapeHtml(item.title)}</h4>
      <p><strong>${item.assessment ? assessmentLabels[item.assessment] : "Not assessed"}</strong></p>
      <p>${escapeHtml(item.notes || "No notes recorded.")}</p>
    </article>
  `;
}

function renderSnapshotItem(section) {
  const response = app.responses[section.id];
  return `
    <article class="snapshot-item">
      <h4>${escapeHtml(section.title)}</h4>
      <p>${response.assessment ? assessmentLabels[response.assessment] : "Not assessed"}</p>
    </article>
  `;
}

function bindPropertyField(elementId, key) {
  document.getElementById(elementId).addEventListener("input", (event) => {
    app.property[key] = event.target.value;
  });
}

function goToStep(step) {
  app.currentStep = Math.min(totalSteps(), Math.max(1, step));
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function currentTitle() {
  if (app.currentStep === 1) return "Property details";
  if (app.currentStep === totalSteps()) return "Smart summary and PDF";
  return app.checklist[app.currentStep - 2].title;
}

function totalSteps() {
  return app.checklist.length + 2;
}

function createDefaultProperty() {
  return {
    propertyAddress: "",
    landlordName: "",
    inspectorName: "",
    inspectionDate: new Date().toISOString().slice(0, 10),
    rentalStage: "Preparing to advertise"
  };
}

function createEmptyResponse(section) {
  const questionAnswers = {};
  section.selfCheckQuestions.forEach((_, index) => {
    questionAnswers[String(index)] = "";
  });

  return {
    assessment: "",
    notes: "",
    questionAnswers
  };
}

function createInitialResponses(checklist) {
  return Object.fromEntries(checklist.map((section) => [section.id, createEmptyResponse(section)]));
}

function resetApp() {
  app.currentStep = 1;
  app.property = createDefaultProperty();
  app.responses = createInitialResponses(app.checklist);
  if (app.pdfUrl) {
    URL.revokeObjectURL(app.pdfUrl);
  }
  app.pdfUrl = "";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function calculateSummary() {
  const reviewItems = app.checklist.flatMap((section) => {
    const response = app.responses[section.id];
    if (!response) return [];
    const shouldList =
      response.assessment === "fail" ||
      response.assessment === "professional";

    return shouldList
      ? [
          {
            sectionId: section.id,
            title: section.title,
            assessment: response.assessment,
            notes: response.notes.trim()
          }
        ]
      : [];
  });

  const passedCount = app.checklist.filter((section) => app.responses[section.id].assessment === "pass").length;
  const failedCount = app.checklist.filter((section) => app.responses[section.id].assessment === "fail").length;
  const needsProfessionalCount = app.checklist.filter((section) => app.responses[section.id].assessment === "professional").length;
  const unansweredCount = app.checklist.filter((section) => !app.responses[section.id].assessment).length;

  let overallResult = "Ready after minor fixes";
  if (failedCount > 3 || needsProfessionalCount > 0) {
    overallResult = "Not ready";
  } else if (failedCount === 0 && needsProfessionalCount === 0 && unansweredCount === 0) {
    overallResult = "Ready to advertise";
  }

  return {
    overallResult,
    passedCount,
    failedCount,
    needsProfessionalCount,
    unansweredCount,
    reviewItems
  };
}

async function buildPdf() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("PDF library could not be loaded. Please check your internet connection and try again.");
    return null;
  }

  app.isGeneratingPdf = true;
  renderSummary();

  try {
    const summary = calculateSummary();
    const doc = createPdfDocument(summary);
    const blob = doc.output("blob");
    if (app.pdfUrl) URL.revokeObjectURL(app.pdfUrl);
    app.pdfUrl = URL.createObjectURL(blob);
    return blob;
  } finally {
    app.isGeneratingPdf = false;
    if (app.currentStep === totalSteps()) {
      renderSummary();
    }
  }
}

async function downloadPdf() {
  const blob = await buildPdf();
  if (!blob || !app.pdfUrl) return;

  const link = document.createElement("a");
  link.href = app.pdfUrl;
  link.download = makeReportFilename(app.property.propertyAddress);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function createPdfDocument(summary) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (height) => {
    if (y + height <= pageHeight - 54) return;
    addFooter();
    doc.addPage();
    y = margin;
  };

  const write = (text, options = {}) => {
    const size = options.size || 10;
    const gap = options.gap ?? 8;
    const indent = options.indent || 0;
    const color = options.color || [23, 32, 42];
    doc.setFont("helvetica", options.style || "normal");
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(String(text || "Not provided"), contentWidth - indent);
    const height = lines.length * (size + 4) + gap;
    ensureSpace(height);
    doc.text(lines, margin + indent, y);
    y += height;
  };

  const divider = () => {
    ensureSpace(18);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;
  };

  function addFooter() {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Rental Minimum Standards Checklist VIC - Self-check report - Page ${doc.getNumberOfPages()}`,
      margin,
      pageHeight - 24
    );
  }

  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, pageWidth, 150, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("Rental Minimum Standards", margin, 62);
  doc.text("Checklist VIC", margin, 92);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text("Self-assessment report", margin, 122);

  y = 190;
  write(app.property.propertyAddress || "Property address not provided", {
    size: 18,
    style: "bold",
    gap: 12
  });
  write(`Overall result: ${summary.overallResult}`, {
    size: 14,
    style: "bold",
    color:
      summary.overallResult === "Not ready"
        ? [153, 27, 27]
        : summary.overallResult === "Ready after minor fixes"
          ? [146, 64, 14]
          : [6, 95, 70]
  });
  write(`Inspection date: ${formatDate(app.property.inspectionDate)}`);
  write(`Generated: ${new Intl.DateTimeFormat("en-AU").format(new Date())}`);
  divider();
  write(disclaimer, { size: 10, color: [71, 85, 105] });
  write("Source reference: Consumer Affairs Victoria rental minimum standards checklist, checked May 2026.", {
    size: 9,
    color: [71, 85, 105]
  });

  addFooter();
  doc.addPage();
  y = margin;

  write("Property details", { size: 18, style: "bold", gap: 14 });
  write(`Property address: ${app.property.propertyAddress || "Not provided"}`);
  write(`Landlord / property manager: ${app.property.landlordName || "Not provided"}`);
  write(`Inspector: ${app.property.inspectorName || "Not provided"}`);
  write(`Inspection date: ${formatDate(app.property.inspectionDate)}`);
  write(`Rental stage: ${app.property.rentalStage}`);
  divider();

  write("Smart summary", { size: 18, style: "bold", gap: 14 });
  write(`Overall result: ${summary.overallResult}`, { style: "bold" });
  write(`Appears compliant: ${summary.passedCount}`);
  write(`Needs review: ${summary.failedCount}`);
  write(`Professional check recommended: ${summary.needsProfessionalCount}`);
  write(`Unanswered sections: ${summary.unansweredCount}`);

  if (summary.reviewItems.length > 0) {
    divider();
    write("Items needing review", { size: 16, style: "bold", gap: 12 });
    summary.reviewItems.forEach((item, index) => {
      write(
        `${index + 1}. ${item.title} - ${
          item.assessment ? assessmentLabels[item.assessment] : "Not assessed"
        }`,
        { style: "bold", gap: 4 }
      );
      write(item.notes || "No notes recorded.", {
        indent: 12,
        color: [71, 85, 105]
      });
    });
  }

  app.checklist.forEach((section, index) => {
    addFooter();
    doc.addPage();
    y = margin;
    const response = app.responses[section.id];
    write(`${index + 1}. ${section.title}`, { size: 18, style: "bold", gap: 12 });
    write("Minimum standard", { size: 12, style: "bold", gap: 6 });
    write(section.officialRequirement, { color: [51, 65, 85] });
    write("Consumer Affairs Victoria guidance summary", { size: 12, style: "bold", gap: 6 });
    write(section.cavExplanation, { color: [51, 65, 85] });

    write("Common issues", { size: 12, style: "bold", gap: 6 });
    section.commonIssues.forEach((issue) => write(`- ${issue}`, { indent: 10, gap: 3 }));

    write("Self-check questions", { size: 12, style: "bold", gap: 6 });
    section.selfCheckQuestions.forEach((question, questionIndex) => {
      const answer = response.questionAnswers[String(questionIndex)] || "not answered";
      write(`- ${question} (${answer})`, { indent: 10, gap: 3 });
    });

    divider();
    write(`Assessment: ${response.assessment ? assessmentLabels[response.assessment] : "Not assessed"}`, {
      style: "bold"
    });
    write(`Notes: ${response.notes || "None"}`);
  });

  addFooter();
  doc.addPage();
  y = margin;
  write("Signature area", { size: 18, style: "bold", gap: 24 });
  write("Inspector signature: __________________________________________", { gap: 24 });
  write("Landlord / agent signature: __________________________________", { gap: 24 });
  write("Date: ____________________", { gap: 24 });
  divider();
  write(disclaimer, { size: 10, color: [71, 85, 105] });
  addFooter();

  return doc;
}

function formatDate(value) {
  if (!value) return "Not provided";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function makeReportFilename(address) {
  const cleanAddress = address
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
  return `${cleanAddress || "rental-checklist-vic"}-self-check-report.pdf`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
