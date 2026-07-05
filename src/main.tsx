import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const navItems = [
  { href: "/", label: "Home" },
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
        <span className="brand-mark" aria-hidden="true" />
        <span>Pluvy</span>
      </a>
      <nav className="top-nav" aria-label="Main navigation">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/support">Support</a>
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

function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Community rainfall logging</p>
          <h1>Pluvy</h1>
          <p className="hero-line">Track real rain with your friends and the world.</p>
          <p className="hero-description">
            Pluvy lets you record rainfall from your saved places, compare your personal stats, share rain cards,
            and help build a community-powered rain map.
          </p>
          <div className="store-row" aria-label="App store availability">
            <span>App Store coming soon</span>
            <span>Google Play coming soon</span>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="rain-card">
            <span className="rain-card-label">Today at Home</span>
            <strong>12.4 mm</strong>
            <small>Shared with friends</small>
          </div>
          <div className="map-grid">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Built for real records</p>
          <h2>Simple enough for daily use, structured enough for useful data.</h2>
        </div>
        <div className="feature-grid">
          <Feature title="Saved places" body="Create places such as Home, Farm, Beach House, or Office, then record rain in seconds." />
          <Feature title="Personal stats" body="See totals, averages, rainy days, monthly trends, and your own rainfall history." />
          <Feature title="Friends" body="Share a friend code and compare rain with people you know, without chat or noisy social feeds." />
          <Feature title="World Map" body="Help build a community-powered map using approximate public locations, never exact private addresses." />
          <Feature title="Share cards" body="Turn your latest record or summary into a clean rain card for sharing." />
          <Feature title="Own data export" body="Export your own records as CSV. Your data should remain accessible to you." />
        </div>
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
    <PolicyPage title="Delete Account" updated="Account deletion requests">
      <p>
        To request deletion of your Pluvy account, email <a href="mailto:support@pluvy.org">support@pluvy.org</a> from
        the email address connected to your account.
      </p>
      <p>
        In-app account deletion will be added before public release if it is not already available in your app version.
      </p>
      <p>
        Account deletion removes or disconnects your account profile, saved locations, private rain records, friend
        connections, and app preferences where technically possible. Some public or community aggregate information may
        be retained in anonymized aggregate form if it can no longer reasonably identify you.
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
