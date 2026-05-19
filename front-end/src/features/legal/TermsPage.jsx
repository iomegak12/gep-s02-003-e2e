import './LegalPages.css';

const EFFECTIVE_DATE = '2026-05-19';
const COMPANY = 'Nexus SCM Enterprises Ltd.';

export default function TermsPage() {
  return (
    <article className="legal">
      <header className="legal__header">
        <h1 className="t-headline">Terms &amp; Conditions</h1>
        <p className="t-body-sm">
          Effective {EFFECTIVE_DATE}. These terms govern your access to and use of the
          Nexus SCM platform ("Service") provided by {COMPANY}.
        </p>
      </header>

      <section className="legal__section">
        <h2>1. Acceptance of terms</h2>
        <p>
          By signing in to the Service, you accept these terms on behalf of yourself
          and the organisation that issued your account. If you do not have authority
          to bind your organisation, do not sign in.
        </p>
      </section>

      <section className="legal__section">
        <h2>2. Scope of the Service</h2>
        <p>The Service provides procurement workflows that include, but are not limited to:</p>
        <ul>
          <li>Supplier master data management and lifecycle (registration, approval, deactivation, blacklisting).</li>
          <li>Purchase order creation, line-item editing, submission, approval, fulfilment and closure.</li>
          <li>Role-based access control across the BUYER, APPROVER and ADMIN personas.</li>
          <li>Spend analytics and supplier performance scorecards.</li>
        </ul>
      </section>

      <section className="legal__section">
        <h2>3. Accounts &amp; authentication</h2>
        <p>
          Accounts are provisioned by administrators of your organisation. You are
          responsible for keeping your credentials confidential and for every action
          performed under your account. Notify your administrator immediately if you
          suspect unauthorised use. The Service does not currently support self-service
          account registration or password reset.
        </p>
      </section>

      <section className="legal__section">
        <h2>4. Roles, approvals and limits</h2>
        <p>
          Approvers are subject to a personal <code className="mono">approval_limit</code>
          set by an administrator. Purchase orders that exceed this limit must be
          routed to an approver with a higher limit. Submitting, approving or rejecting
          a purchase order through the Service constitutes a binding action on behalf
          of your organisation. You agree not to attempt to circumvent role checks or
          approval thresholds.
        </p>
      </section>

      <section className="legal__section">
        <h2>5. Supplier data and confidentiality</h2>
        <p>
          Supplier master data, contracts, payment terms, scorecards and pricing
          information may include confidential or commercially sensitive information.
          You agree to:
        </p>
        <ul>
          <li>Use such data only for legitimate procurement activities within your organisation.</li>
          <li>Not export, screenshot or share supplier data with third parties unless authorised.</li>
          <li>Treat blacklist reasons and approval comments as internal-only.</li>
        </ul>
      </section>

      <section className="legal__section">
        <h2>6. Acceptable use</h2>
        <p>You will not:</p>
        <ul>
          <li>Reverse-engineer, scrape or stress-test the Service or its APIs.</li>
          <li>Upload data you do not have the right to share.</li>
          <li>Create suppliers or purchase orders for fraudulent, sanctioned or otherwise unlawful purposes.</li>
          <li>Interfere with the Service's audit trail, correlation identifiers or status timestamps.</li>
        </ul>
      </section>

      <section className="legal__section">
        <h2>7. Audit and correlation</h2>
        <p>
          Every request to the Service carries an <code className="mono">X-Correlation-Id</code>
          header which is logged together with the requesting account, timestamp and
          response status. Status transitions on suppliers and purchase orders are
          immutable once committed. You consent to this logging for security, debugging
          and audit purposes.
        </p>
      </section>

      <section className="legal__section">
        <h2>8. Intellectual property</h2>
        <p>
          The Service, including the user interface, source code, design system
          ("Nexus") and documentation, is owned by {COMPANY} and protected by
          intellectual-property laws. You receive a non-exclusive, non-transferable,
          revocable licence to use the Service for your organisation's internal
          procurement operations.
        </p>
      </section>

      <section className="legal__section">
        <h2>9. Service availability</h2>
        <p>
          The Service is offered on a best-effort basis. Planned maintenance windows,
          third-party outages (e.g. supplier service downtime), and infrastructure
          changes may interrupt availability. The service-health indicator in the
          application top bar reflects the live status of the IAM, Supplier and
          Purchase Order services.
        </p>
      </section>

      <section className="legal__section">
        <h2>10. Disclaimer and limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, the Service is provided "as is" and
          "as available." {COMPANY} disclaims all warranties, express or implied,
          including merchantability, fitness for a particular purpose and
          non-infringement. {COMPANY} is not liable for indirect, incidental,
          consequential or punitive damages arising out of your use of the Service.
        </p>
      </section>

      <section className="legal__section">
        <h2>11. Termination</h2>
        <p>
          Your administrator may deactivate your account at any time. {COMPANY} may
          suspend or terminate access in case of material breach of these terms, with
          or without notice. Suppliers and purchase orders you created remain in the
          Service for audit purposes after your account is deactivated.
        </p>
      </section>

      <section className="legal__section">
        <h2>12. Changes to these terms</h2>
        <p>
          We may revise these terms from time to time. Material changes will be
          communicated through the in-app notification system. Continued use of the
          Service after a change takes effect constitutes acceptance of the revised
          terms.
        </p>
      </section>

      <section className="legal__section">
        <h2>13. Governing law</h2>
        <p>
          These terms are governed by the laws of India. Any disputes will be subject
          to the exclusive jurisdiction of the courts located in Bengaluru, Karnataka.
        </p>
      </section>

      <footer className="legal__footer">
        <p className="t-body-sm">
          Questions about these terms? Visit the <a href="/support">Support</a> page or
          contact your administrator.
        </p>
      </footer>
    </article>
  );
}
