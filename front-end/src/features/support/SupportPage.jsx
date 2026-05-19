import { useState } from 'react';
import { ChevronDown, Mail, MessageSquare, Clock, Activity, BookOpen } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import ServiceHealthModal from '../../components/shell/ServiceHealthModal.jsx';
import './SupportPage.css';

const FAQS = [
  {
    q: 'How do I create a supplier?',
    a: 'Go to Suppliers → Create supplier. A 4-step wizard captures identity, contact, address (India only for now) and commercial terms. New suppliers land in PENDING_APPROVAL until an admin reviews them.'
  },
  {
    q: 'Why can I not raise a PO against a supplier I just created?',
    a: 'New suppliers stay in PENDING_APPROVAL until an admin approves them. POs can only be raised against suppliers in the ACTIVE state.'
  },
  {
    q: 'My PO was auto-approved — what does that mean?',
    a: 'If a PO total is at or below the configured approval threshold, the back-end auto-approves it on submit, skipping the approver queue. You will see a distinct "Auto-approved" toast.'
  },
  {
    q: 'I am an approver but I cannot approve some POs in my inbox.',
    a: 'Each approver has a personal approval_limit set by an admin. POs whose total exceeds your limit are excluded from your queue (with a footnote count) and routed to an approver with a higher limit.'
  },
  {
    q: 'I rejected a PO by mistake. Can it be reopened?',
    a: 'Yes. The buyer can use the Revise action on a REJECTED PO, which returns it to DRAFT for edits. Once corrected, the buyer re-submits and it flows through the approval process again.'
  },
  {
    q: 'What is the difference between blacklisting and deactivating a supplier?',
    a: 'Blacklisting permanently blocks new POs and is intended for compliance, fraud or contract-breach issues. Deactivation is reversible and is for temporary pauses (e.g. failed renewal). Existing POs are not cancelled in either case.'
  },
  {
    q: 'I forgot my password.',
    a: 'Self-service password reset is not available. Ask an admin to reset your password from the Users → User detail → Reset password modal. They will share the new credential with you securely.'
  },
  {
    q: 'How do I report a bug?',
    a: 'Open the error toast and copy the correlation ID (it appears in the "Details" expander, or directly in the toast if you enable the debug toggle in Settings). Email the ID, the screen you were on and the steps to reproduce to the address below.'
  },
  {
    q: 'Where is the dark theme stored?',
    a: 'In your browser, under localStorage key gep.theme. Clearing browser data will reset it to your OS preference.'
  },
  {
    q: 'Are supplier list / PO list views the same for everyone?',
    a: 'The list itself is shared, but the actions visible per row depend on your role. Only admins see kebab actions on suppliers. Only buyers/admins can edit line items on DRAFT POs.'
  }
];

export default function SupportPage() {
  const [open, setOpen] = useState(0);
  const [healthOpen, setHealthOpen] = useState(false);

  return (
    <div className="support">
      <header className="support__header">
        <h1 className="t-headline">Support</h1>
        <p className="t-body-sm">Common questions, contact details, and live service status.</p>
      </header>

      <section className="support__contact">
        <ContactCard
          Icon={Mail}
          title="Email"
          line1="support@nexus-scm.example"
          line2="We reply within one business day."
          href="mailto:support@nexus-scm.example"
        />
        <ContactCard
          Icon={MessageSquare}
          title="In-app chat"
          line1="Use the chat bubble (bottom-right)"
          line2="Live during business hours (IST)."
        />
        <ContactCard
          Icon={Clock}
          title="Business hours"
          line1="Mon–Fri · 09:00 – 18:00 IST"
          line2="Outside hours: email only."
        />
        <ContactCard
          Icon={BookOpen}
          title="Knowledge base"
          line1="docs.nexus-scm.example"
          line2="Guides, runbooks, API reference."
        />
      </section>

      <section className="support__status">
        <div>
          <h2 className="t-headline" style={{ fontSize: 16 }}>Live service status</h2>
          <p className="t-body-sm">Live health of IAM, Supplier and Purchase Order services.</p>
        </div>
        <Button variant="secondary" startIcon={<Activity size={14} />} onClick={() => setHealthOpen(true)}>
          Open status
        </Button>
      </section>

      <section className="support__faq">
        <h2 className="t-caps">Frequently asked</h2>
        <div className="support__faq-list">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div className={`faq${isOpen ? ' is-open' : ''}`} key={i}>
                <button
                  type="button"
                  className="faq__head"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                >
                  <span>{f.q}</span>
                  <ChevronDown size={16} className="faq__chevron" />
                </button>
                {isOpen && <div className="faq__body t-body">{f.a}</div>}
              </div>
            );
          })}
        </div>
      </section>

      <ServiceHealthModal open={healthOpen} onClose={() => setHealthOpen(false)} />
    </div>
  );
}

function ContactCard({ Icon, title, line1, line2, href }) {
  const inner = (
    <>
      <div className="support__contact-icon"><Icon size={18} /></div>
      <div>
        <div className="t-body" style={{ fontWeight: 600 }}>{title}</div>
        <div className="t-body">{line1}</div>
        <div className="t-body-sm">{line2}</div>
      </div>
    </>
  );
  return href ? (
    <a className="support__contact-card" href={href}>{inner}</a>
  ) : (
    <div className="support__contact-card">{inner}</div>
  );
}
