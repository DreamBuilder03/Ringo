import type { Metadata } from "next";
import { LegalLayout } from "../legal/legal-layout";

export const metadata: Metadata = {
  title: "Privacy Policy — OMRI",
  description:
    "How OMRI AI, Inc. collects, uses, and protects information when you use our voice ordering platform.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" effectiveDate="April 14, 2026">
      <p>
        This Privacy Policy describes how <strong>OMRI AI, Inc.</strong>{" "}
        (&ldquo;OMRI,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
        &ldquo;our&rdquo;) collects, uses, shares, and protects information in
        connection with our AI voice ordering platform, websites at{" "}
        <a href="https://joinomri.com">joinomri.com</a>, and related services
        (collectively, the &ldquo;Service&rdquo;). By using the Service, you
        agree to the practices described here.
      </p>

      <h2>1. Who this policy covers</h2>
      <p>
        OMRI serves two groups: (a) <strong>Restaurant customers</strong> who
        subscribe to OMRI to handle inbound calls, and (b){" "}
        <strong>End callers</strong> — the diners who phone a restaurant that
        uses OMRI. This policy applies to both, with the distinctions noted
        below.
      </p>

      <h2>2. Information we collect</h2>
      <h3>From restaurant customers</h3>
      <ul>
        <li>
          Account details: business name, owner name, email, phone, address,
          point-of-sale provider, menu data, hours of operation.
        </li>
        <li>
          Billing information: payment method and billing address, processed by
          our payment processor (Stripe). OMRI does not store full card
          numbers.
        </li>
        <li>
          Product usage: dashboard interactions, call volume, configuration
          choices, support tickets.
        </li>
      </ul>
      <h3>From end callers</h3>
      <ul>
        <li>
          <strong>Voice recordings and transcripts</strong> of calls placed to
          a OMRI-enabled restaurant number, used to take the order and
          improve call handling.
        </li>
        <li>
          Phone number (caller ID), order details, and, if the caller provides
          it, name and delivery address.
        </li>
        <li>
          SMS messages sent to the caller for payment links, order
          confirmations, or receipts, and delivery status for those messages.
        </li>
      </ul>
      <h3>From visitors to our website</h3>
      <ul>
        <li>
          Log data (IP address, browser, pages viewed), cookies strictly
          necessary to operate the site, and information you voluntarily submit
          (e.g., a demo request form).
        </li>
      </ul>

      <h2>3. How we use information</h2>
      <ul>
        <li>Operate the Service, take orders, and route them to the restaurant&rsquo;s POS.</li>
        <li>Send transactional SMS (payment links, order confirmations).</li>
        <li>Provide the restaurant with its call log, transcripts, and analytics.</li>
        <li>Bill restaurant customers and prevent fraud.</li>
        <li>Improve our speech recognition, AI models, and menu accuracy.</li>
        <li>Comply with law and enforce our Terms of Service.</li>
      </ul>

      <h2>4. Call recording notice</h2>
      <p>
        Calls placed to OMRI-enabled restaurant numbers are recorded and
        transcribed. The restaurant is the caller&rsquo;s point of contact and
        is responsible for disclosing recording where its state or province
        requires notice or two-party consent (e.g., California&rsquo;s Invasion
        of Privacy Act). OMRI provides a default spoken disclosure at the
        start of calls; restaurants may customize it but must remain compliant.
      </p>

      <h2>5. SMS and messaging</h2>
      <p>
        When OMRI texts an end caller (for a payment link, receipt, or order
        update), the message is sent only as a direct consequence of an order
        or demo the caller initiated. Standard message and data rates may
        apply. Reply <strong>STOP</strong> to opt out; reply{" "}
        <strong>HELP</strong> for help.
      </p>

      <h2>6. How we share information</h2>
      <ul>
        <li>
          <strong>With the restaurant</strong> whose number was called, so it
          can fulfill the order.
        </li>
        <li>
          <strong>With service providers</strong> that power OMRI under
          contract: voice AI (Retell), telephony and SMS (Twilio, GoHighLevel),
          cloud infrastructure (Vercel, Supabase), payments (Stripe), and
          transcription/LLM providers (OpenAI, Anthropic, Google). These
          providers are permitted to use data only to provide their services
          to OMRI.
        </li>
        <li>
          <strong>For legal reasons</strong>: to comply with a lawful request,
          protect our rights, or prevent fraud or abuse.
        </li>
        <li>
          <strong>In a business transfer</strong> (merger, acquisition), with
          notice to you.
        </li>
      </ul>
      <p>
        We do <strong>not</strong> sell personal information and we do not use
        end-caller voice recordings to market to those callers.
      </p>

      <h2>7. Data retention</h2>
      <p>
        Call recordings and transcripts are retained for as long as the
        restaurant&rsquo;s account is active, plus up to 90 days afterward,
        unless a shorter period is set by the restaurant or required by law.
        Billing records are retained for seven (7) years to satisfy tax and
        accounting requirements.
      </p>

      <h2>8. Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct,
        delete, or receive a copy of your personal information, or to object to
        or restrict certain processing. California residents have additional
        rights under the CCPA/CPRA, including the right to know what personal
        information we have collected, the right to delete, the right to
        correct, and the right to opt out of any &ldquo;sale&rdquo; or
        &ldquo;sharing&rdquo; (OMRI does neither).
      </p>
      <p>
        To exercise any right, email{" "}
        <a href="mailto:privacy@joinomri.com">privacy@joinomri.com</a>. We will
        verify your request before responding. We will not discriminate against
        you for exercising a privacy right.
      </p>

      <h2>9. Security</h2>
      <p>
        We use TLS for data in transit, encryption at rest for our database,
        role-based access controls, and audit logs. No system is perfectly
        secure; if we become aware of a breach that affects you, we will
        notify you as required by law.
      </p>

      <h2>10. Children</h2>
      <p>
        The Service is not directed to children under 13 and we do not
        knowingly collect personal information from them. If you believe a
        child has provided us information, contact{" "}
        <a href="mailto:privacy@joinomri.com">privacy@joinomri.com</a>.
      </p>

      <h2>11. International users</h2>
      <p>
        OMRI operates in the United States. If you use the Service from
        outside the U.S., your information will be transferred to and processed
        in the U.S.
      </p>

      <h2>12. Changes</h2>
      <p>
        We may update this Privacy Policy from time to time. We will post the
        updated version at this URL and revise the &ldquo;Effective date&rdquo;
        above. Material changes will be notified to restaurant customers by
        email.
      </p>

      <h2>13. Contact</h2>
      <p>
        OMRI AI, Inc. &middot; Modesto, California, USA <br />
        Email: <a href="mailto:privacy@joinomri.com">privacy@joinomri.com</a>
      </p>
    </LegalLayout>
  );
}
