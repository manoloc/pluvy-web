import React from "react";
import { createRoot } from "react-dom/client";
import ExcelJS from "exceljs";
import "./styles.css";

const FUNCTIONS_BASE = "https://us-central1-pluvy-f6741.cloudfunctions.net";
const APP_STORE_URL = "https://apps.apple.com/us/app/pluvy-app/id6787290424";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/data", label: "Data" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/honor-code", label: "Honor Code" },
  { href: "/delete-account", label: "Delete Account" },
  { href: "/support", label: "Support" }
];

const honorCodeText = [
  "Pluvy is built by people who care about real rainfall records.",
  "By joining, you agree to submit honest measurements based on your own rain gauge, trusted source, or personal record. Community data only works when users contribute responsibly.",
  "Pluvy may flag, hide, or exclude unusual or repeatedly inaccurate records from public maps, rankings, and shared statistics.",
  "Your private records will remain yours, but shared records must follow the community honor code."
];

function App() {
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  if (redirect) {
    window.history.replaceState(null, "", redirect);
  }

  const path = normalizePath(window.location.pathname);
  const page = getPage(path);

  return (
    <div className="site-shell">
      <Header />
      <main>{page}</main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Pluvy home">
        <img className="brand-logo" src="/pluvy-icon.png" alt="" />
        <span>Pluvy</span>
      </a>
      <nav className="top-nav" aria-label="Main navigation">
        <a href="/data">Data</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a className="nav-download" href={APP_STORE_URL} target="_blank" rel="noreferrer">Download</a>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <strong>Pluvy App</strong>
        <p>Track real rain with your friends and the world.</p>
      </div>
      <nav aria-label="Footer navigation">
        {navItems.slice(1).map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
    </footer>
  );
}

type DataSession = { token: string; locationName: string; operation: "import" | "export"; expiresAt: string };
type PreviewRow = { rowNumber: number; status: "valid" | "warning" | "invalid" | "duplicate"; message: string; included: boolean; date?: string; rainfallMm?: number; notes?: string };

function DataPage() {
  const [language, setLanguage] = React.useState<"en" | "es">(() => navigator.language.toLowerCase().startsWith("es") ? "es" : "en");
  const [code, setCode] = React.useState("");
  const [session, setSession] = React.useState<DataSession>();
  const [rows, setRows] = React.useState<PreviewRow[]>([]);
  const [rawRows, setRawRows] = React.useState<Record<string, unknown>[]>([]);
  const [summary, setSummary] = React.useState<{ found: number; valid: number; warnings: number; invalid: number; duplicates: number }>();
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const es = language === "es";

  const validateCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setMessage("");
    try { setSession(await callFunction<DataSession>("validateWebDataSession", { code })); }
    catch (error) { setMessage(readError(error, es ? "El codigo no es valido o expiro." : "The code is invalid or expired.")); }
    finally { setBusy(false); }
  };

  const readFile = async (file?: File) => {
    if (!file || !session) return;
    setBusy(true); setMessage(""); setRows([]);
    try {
      let data: Record<string, unknown>[];
      if (file.name.toLowerCase().endsWith(".csv")) {
        data = parseCsv(await file.text());
      } else {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const sheet = workbook.worksheets[0];
        if (!sheet) throw new Error(es ? "El archivo no tiene una hoja." : "The file has no worksheet.");
        const headers = (sheet.getRow(1).values as ExcelJS.CellValue[]).slice(1).map((value) => String(value ?? ""));
        data = [];
        sheet.eachRow((row, rowNumber) => { if (rowNumber > 1) { const values = (row.values as ExcelJS.CellValue[]).slice(1); if (values.some((value) => value !== null && value !== undefined && value !== "")) data.push(Object.fromEntries(headers.map((header, index) => [header, cellValue(values[index])]))); } });
      }
      const normalized = data.map((row, index) => ({ rowNumber: index + 2, date: pickColumn(row, ["date", "fecha"]), rainfall: pickColumn(row, ["rainfall", "rainfall mm", "lluvia", "precipitacion", "precipitación"]), notes: pickColumn(row, ["notes", "note", "notas", "nota"]), included: true }));
      const result = await callFunction<{ rows: PreviewRow[]; summary: typeof summary }>("previewRainImport", { token: session.token, rows: normalized });
      setRawRows(normalized); setRows(result.rows); setSummary(result.summary);
    } catch (error) { setMessage(readError(error, es ? "No pudimos leer o validar el archivo." : "We could not read or validate the file.")); }
    finally { setBusy(false); }
  };

  const commit = async () => {
    if (!session) return;
    const selected = rawRows.filter((_, index) => rows[index]?.included && ["valid", "warning"].includes(rows[index]?.status));
    setBusy(true); setMessage("");
    try {
      const result = await callFunction<{ imported: number }>("commitRainImport", { token: session.token, rows: selected });
      setMessage(es ? `${result.imported} registros importados correctamente.` : `${result.imported} records imported successfully.`); setRows([]); setRawRows([]);
    } catch (error) { setMessage(readError(error, es ? "No se importaron registros." : "No records were imported.")); }
    finally { setBusy(false); }
  };

  const exportData = async () => {
    if (!session) return;
    setBusy(true); setMessage("");
    try {
      const result = await callFunction<{ locationName: string; unit: string; records: { date: string; rainfall: number; notes: string }[] }>("exportRainData", { token: session.token });
      const workbook = new ExcelJS.Workbook();
      const recordsSheet = workbook.addWorksheet("Rainfall Records");
      recordsSheet.columns = [{ header: "Date", key: "date", width: 16 }, { header: `Rainfall (${result.unit})`, key: "rainfall", width: 18 }, { header: "Notes", key: "notes", width: 48 }];
      result.records.forEach((record) => recordsSheet.addRow(record));
      recordsSheet.getRow(1).font = { bold: true };
      downloadWorkbook(await workbook.xlsx.writeBuffer(), `Pluvy-${safeFilename(result.locationName)}.xlsx`);
    } catch (error) { setMessage(readError(error, es ? "No pudimos exportar los registros." : "We could not export the records.")); }
    finally { setBusy(false); }
  };

  return (
    <section className="data-page">
      <div className="data-language" aria-label="Language"><button className={es ? "" : "active"} onClick={() => setLanguage("en")}>EN</button><button className={es ? "active" : ""} onClick={() => setLanguage("es")}>ES</button></div>
      <p className="eyebrow">Pluvy Data</p>
      <h1>{es ? "Importa o exporta tus datos de Pluvy" : "Import or export your Pluvy data"}</h1>
      {!session ? (
        <div className="data-panel">
          <ol className="data-steps">
            <li>{es ? "Abre Pluvy en tu telefono." : "Open Pluvy on your phone."}</li><li>{es ? "Ve a Ajustes → Importar / Exportar." : "Go to Settings → Import / Export Data."}</li><li>{es ? "Elige una ubicacion y genera un codigo." : "Choose a location and generate a code."}</li><li>{es ? "Ingresa el codigo aqui." : "Enter the code here."}</li>
          </ol>
          <form onSubmit={validateCode}><label htmlFor="data-code">{es ? "Codigo de 8 caracteres" : "8-character code"}</label><input id="data-code" inputMode="text" autoCapitalize="characters" autoComplete="one-time-code" maxLength={9} placeholder="ABCD-EFGH" value={code} onChange={(event) => setCode(formatWebCode(event.target.value))} /><button className="data-primary" disabled={busy || normalizeWebCode(code).length !== 8}>{busy ? (es ? "Revisando…" : "Checking…") : (es ? "Continuar" : "Continue")}</button></form>
        </div>
      ) : (
        <div className="data-panel">
          <div className="data-location"><span>{es ? "Ubicacion seleccionada" : "Selected location"}</span><strong>{session.locationName}</strong></div>
          {session.operation === "export" ? <><p>{es ? "Descarga un archivo Excel facil de leer con el historial de esta ubicacion." : "Download an easy-to-read Excel file with this location's history."}</p><button className="data-primary" disabled={busy} onClick={exportData}>{es ? "Exportar historial de lluvia" : "Export rainfall history"}</button></> : <>
            <div className="data-actions"><button onClick={() => downloadTemplate(es)}>{es ? "Descargar plantilla Excel" : "Download Excel Template"}</button><label className="data-file">{es ? "Elegir Excel o CSV" : "Choose Excel or CSV"}<input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => readFile(event.target.files?.[0])} /></label></div>
            {summary ? <div className="data-summary"><span>{summary.found} {es ? "encontrados" : "found"}</span><span>{summary.valid} {es ? "validos" : "valid"}</span><span>{summary.warnings} {es ? "avisos" : "warnings"}</span><span>{summary.duplicates} {es ? "duplicados" : "duplicates"}</span></div> : null}
            {rows.length ? <><div className="data-table-wrap"><table><thead><tr><th>{es ? "Incluir" : "Include"}</th><th>{es ? "Fila" : "Row"}</th><th>{es ? "Fecha" : "Date"}</th><th>{es ? "Lluvia" : "Rainfall"}</th><th>{es ? "Resultado" : "Result"}</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.rowNumber} className={`row-${row.status}`}><td><input type="checkbox" checked={row.included} disabled={["invalid", "duplicate"].includes(row.status)} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, included: event.target.checked } : item))} /></td><td>{row.rowNumber}</td><td>{row.date ?? "—"}</td><td>{row.rainfallMm ?? "—"} mm</td><td>{row.message || (es ? "Listo" : "Ready")}</td></tr>)}</tbody></table></div><button className="data-primary" disabled={busy || !rows.some((row) => row.included && ["valid", "warning"].includes(row.status))} onClick={commit}>{es ? "Confirmar importacion" : "Confirm import"}</button></> : null}
          </>}
        </div>
      )}
      {message ? <p className="data-message" role="status">{message}</p> : null}
      <p className="data-privacy">{es ? "El codigo expira en 15 minutos. Esta pagina nunca muestra tu direccion ni tus coordenadas privadas." : "The code expires in 15 minutes. This page never shows your private address or coordinates."}</p>
    </section>
  );
}

async function callFunction<T>(name: string, data: unknown): Promise<T> {
  const response = await fetch(`${FUNCTIONS_BASE}/${name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) throw new Error(payload.error?.message || "Request failed.");
  return payload.result as T;
}

function pickColumn(row: Record<string, unknown>, aliases: string[]) { const entry = Object.entries(row).find(([key]) => aliases.includes(key.trim().toLowerCase())); return entry?.[1]; }
function normalizeWebCode(value: string) { return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8); }
function formatWebCode(value: string) { const normalized = normalizeWebCode(value); return normalized.length > 4 ? `${normalized.slice(0, 4)}-${normalized.slice(4)}` : normalized; }
function parseCsv(text: string) { const firstLine = text.split(/\r?\n/, 1)[0] ?? ""; const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ","; const parsed: string[][] = []; let row: string[] = []; let value = ""; let quoted = false; for (let index = 0; index < text.length; index += 1) { const char = text[index]; if (char === '"') { if (quoted && text[index + 1] === '"') { value += '"'; index += 1; } else quoted = !quoted; } else if (char === delimiter && !quoted) { row.push(value); value = ""; } else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[index + 1] === "\n") index += 1; row.push(value); if (row.some((cell) => cell.trim())) parsed.push(row); row = []; value = ""; } else value += char; } row.push(value); if (row.some((cell) => cell.trim())) parsed.push(row); const headers = parsed.shift()?.map((header) => header.trim()) ?? []; return parsed.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]))); }
function cellValue(value: ExcelJS.CellValue | undefined): unknown { if (value instanceof Date) return value; if (value && typeof value === "object" && "result" in value) return value.result; if (value && typeof value === "object" && "text" in value) return value.text; return value ?? ""; }
function readError(error: unknown, fallback: string) { return error instanceof Error && error.message ? error.message : fallback; }
function safeFilename(value: string) { return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") || "Rainfall"; }
function downloadWorkbook(buffer: ExcelJS.Buffer, filename: string) { const blob = new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
async function downloadTemplate(es: boolean) { const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet("Template"); sheet.columns = [{ header: "Date", key: "date", width: 18 }, { header: "Rainfall", key: "rainfall", width: 18 }, { header: "Notes", key: "notes", width: 48 }]; sheet.addRow({ date: "2026-01-15", rainfall: 12.5, notes: es ? "Ejemplo opcional" : "Optional example" }); sheet.addRow({ date: "15/02/2026", rainfall: 8, notes: "" }); sheet.addRow([]); sheet.addRow([es ? "Instrucciones" : "Instructions"]); sheet.addRow([es ? "Usa AAAA-MM-DD o DD/MM/AAAA. Lluvia se ingresa en mm. Notas es opcional." : "Use YYYY-MM-DD or DD/MM/YYYY. Enter rainfall in mm. Notes are optional."]); sheet.getRow(1).font = { bold: true }; downloadWorkbook(await workbook.xlsx.writeBuffer(), "Pluvy-rainfall-template.xlsx"); }

function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Personal and community rainfall</p>
          <h1>Pluvy</h1>
          <p className="hero-line">Your rainfall history, clearly recorded.</p>
          <p className="hero-description">
            Save measurements from the places you care about, understand long-term patterns, and explore shared rainfall
            data without exposing exact private locations.
          </p>
          <div className="hero-actions">
            <a className="app-store-button" href={APP_STORE_URL} target="_blank" rel="noreferrer">
              <small>Download on the</small>
              <strong>App Store</strong>
            </a>
            <a className="data-link-button" href="/data">Import or export data</a>
          </div>
          <p className="hero-platform-note">Available for iPhone and iPad.</p>
        </div>
        <div className="hero-visual">
          <img src="/pluvy-record.png" alt="Pluvy rainfall recording screen on iPhone" />
        </div>
      </section>

      <section className="trust-strip" aria-label="Pluvy highlights">
        <span><strong>Fast records</strong> Date, place and rainfall</span>
        <span><strong>Private by design</strong> Exact locations stay private</span>
        <span><strong>Your data</strong> Import and export anytime</span>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Built for real records</p>
          <h2>Built for a daily habit. Ready for years of useful history.</h2>
        </div>
        <div className="feature-grid">
          <Feature title="Saved places" body="Create places such as Home, Farm, Beach House, or Office, then record rain in seconds." />
          <Feature title="Personal stats" body="See totals, averages, rainy days, monthly trends, and your own rainfall history." />
          <Feature title="Friends" body="Share a friend code and compare rain with people you know, without chat or noisy social feeds." />
          <Feature title="World Map" body="Help build a community-powered map using approximate public locations, never exact private addresses." />
          <Feature title="Share cards" body="Turn your latest record or summary into a clean rain card for sharing." />
          <Feature title="Your data stays portable" body="Import or export rainfall history securely from your phone or computer." />
        </div>
      </section>

      <section className="section pricing-section">
        <div className="section-heading">
          <p className="eyebrow">Pluvy Plus and Credits</p>
          <h2>Optional upgrades for deeper rain analysis.</h2>
        </div>
        <div className="pricing-grid">
          <article className="pricing-card pricing-card-featured">
            <p className="price-label">Pluvy Plus</p>
            <h3>US$1.99 / month</h3>
            <p>Or US$14.99 / year. Unlock advanced reports, richer analysis, and historical map tools.</p>
          </article>
          <article className="pricing-card">
            <p className="price-label">Pluvy Credits</p>
            <h3>5 for US$0.99</h3>
            <p>Also available: 15 credits for US$2.99 and 40 credits for US$5.99.</p>
          </article>
        </div>
        <p className="pricing-note">Your own rain records and CSV export remain available without Pluvy Plus.</p>
      </section>

      <section className="privacy-band">
        <div>
          <p className="eyebrow">Privacy first</p>
          <h2>Exact places stay private.</h2>
          <p>
            Pluvy separates private coordinates from approximate public fields. Shared maps, friend feeds, and
            aggregates are designed around safe location display.
          </p>
        </div>
        <a className="text-link" href="/privacy">
          Read the Privacy Policy
        </a>
      </section>
    </>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <article className="feature-card">
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function PrivacyPage() {
  return (
    <PolicyPage title="Privacy Policy" updated="Last updated: July 3, 2026">
      <p>
        Pluvy is designed to help people record real rainfall, compare personal stats, share rain cards, and
        contribute to privacy-safe community rainfall information.
      </p>
      <h2>Information we collect</h2>
      <p>
        Pluvy may collect account data, saved locations, rain records, friend codes, friendship connections, app
        preferences, CSV import/export metadata, and support messages you send us. Future versions may include ads,
        premium status, or rewarded unlocks, and those features may require additional technical metadata.
      </p>
      <h2>Location privacy</h2>
      <p>
        Saved locations can include exact private addresses or private coordinates so your own records and stats work
        correctly. Exact private addresses and private coordinates are not publicly displayed. Public map data uses
        approximate public location fields such as public labels, rounded coordinates, grid cells, city, region, or
        country.
      </p>
      <h2>Rain records and community data</h2>
      <p>
        Rain records may be private, visible to accepted friends, visible on the public World Map, or both. Public
        records may be aggregated into community statistics using approximate location fields.
      </p>
      <h2>Your choices</h2>
      <p>
        You can keep locations private, export your own rain records, and request account deletion. To request deletion,
        contact <a href="mailto:support@pluvy.org">support@pluvy.org</a>.
      </p>
    </PolicyPage>
  );
}

function TermsPage() {
  return (
    <PolicyPage title="Terms of Use" updated="Last updated: July 3, 2026">
      <p>
        Pluvy is a community rainfall logging app. By using Pluvy, you agree to submit honest records and use the app
        responsibly.
      </p>
      <h2>Community-submitted data</h2>
      <p>
        Rainfall records are submitted by users and may contain mistakes, delays, incorrect units, or incorrect
        locations. Pluvy may flag, hide, or exclude records from shared maps, rankings, and statistics when needed.
      </p>
      <h2>Not an official weather service</h2>
      <p>
        Pluvy is not an official weather service and should not be used for emergency, safety, agricultural,
        operational, legal, or financial decisions. Forecast context, if added later, will be informational only.
      </p>
      <h2>Honor Code</h2>
      <p>
        Users should submit measurements based on their own rain gauge, trusted source, or personal record. Shared
        records must follow the Pluvy Honor Code.
      </p>
    </PolicyPage>
  );
}

function HonorCodePage() {
  return (
    <PolicyPage title="Pluvy Honor Code" updated="For community rainfall records">
      {honorCodeText.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </PolicyPage>
  );
}

function DeleteAccountPage() {
  return (
    <PolicyPage title="Delete your Pluvy account / Eliminar tu cuenta de Pluvy" updated="Account deletion requests">
      <p>
        You can request deletion inside the app from <strong>Settings</strong>, in the{" "}
        <strong>Help and account</strong> section, by tapping <strong>Delete account</strong> and confirming the prompt.
      </p>
      <p>
        The app creates a server-side deletion request and then attempts to delete the Firebase Authentication account.
        If Firebase requires recent sign-in, sign in again and retry.
      </p>
      <p>
        If you cannot access the app, email <a href="mailto:support@pluvy.org">support@pluvy.org</a> from the email
        address connected to your account when possible, with the subject <strong>Pluvy account deletion request</strong>.
      </p>
      <p>
        Account deletion removes or disconnects your account profile, saved locations, private rain records, friend
        connections, app preferences, and server-owned derived friend/map documents where technically and legally
        possible. Some security, fraud, accounting, purchase, legal, or anonymized aggregate records may be retained
        when required or when they can no longer reasonably identify you.
      </p>
      <p>
        Pluvy aims to process deletion requests within 30 days and may ask you to verify control of the account email
        or confirm account details before deletion. See the <a href="/privacy">Privacy Policy</a> for more detail.
      </p>
    </PolicyPage>
  );
}

function SupportPage() {
  return (
    <PolicyPage title="Support" updated="We are here to help">
      <p>
        Contact Pluvy support at <a href="mailto:support@pluvy.org">support@pluvy.org</a>.
      </p>
      <div className="faq-list">
        <Faq question="Is Pluvy an official weather app?">
          No. Pluvy is for personal rainfall logging and community-submitted rainfall records. It is not an official
          weather service.
        </Faq>
        <Faq question="Does Pluvy track my live location?">
          No. Pluvy uses saved places. A one-time current-location helper may be used to create a saved place, but live
          tracking is not the product behavior.
        </Faq>
        <Faq question="Can I export my own data?">
          Yes. Own-data CSV export is intended to remain free and unlimited.
        </Faq>
        <Faq question="Can I keep locations private?">
          Yes. Locations can be private, and exact private addresses or coordinates are not shown publicly.
        </Faq>
      </div>
    </PolicyPage>
  );
}

function Faq({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <article className="faq-item">
      <h2>{question}</h2>
      <p>{children}</p>
    </article>
  );
}

function PolicyPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <section className="policy-page">
      <p className="eyebrow">{updated}</p>
      <h1>{title}</h1>
      <div className="policy-content">{children}</div>
    </section>
  );
}

function getPage(path: string) {
  switch (path) {
    case "/":
      return <HomePage />;
    case "/privacy":
      return <PrivacyPage />;
    case "/terms":
      return <TermsPage />;
    case "/honor-code":
      return <HonorCodePage />;
    case "/delete-account":
      return <DeleteAccountPage />;
    case "/support":
      return <SupportPage />;
    case "/data":
      return <DataPage />;
    default:
      return <HomePage />;
  }
}

function normalizePath(path: string) {
  if (!path || path === "") return "/";
  return path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
