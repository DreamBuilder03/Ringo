import type { Metadata } from "next";
import { LegalLayout } from "../legal/legal-layout";

export const metadata: Metadata = {
  title: "Terms of Service — OMRI",
  description:
    "The terms that govern your use of OMRI's AI voice ordering platform.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" effectiveDate="April 14, 2026">
      <p>
        These Terms of Service (the &ldquo;Terms&rdquo;) are a binding
        agreement between <strong>OMRI AI, Inc.</strong> (&ldquo;OMRI,&rdquo;
        &ldquo;we,&rdquo; &ldquo;us&rdquo;) and the person or entity agreeing
        to them (&ldquo;you&rdquo; or &ldquo;Customer&rdquo;). By signing up
        for, accessing, or using the OMRI platform at{" "}
        <a href="https://omriapp.com">omriapp.com</a> (the
        &ldquo;Service&rdquo;), you agree to these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        OMRI provides an AI voice agent that answers inbound phone calls for
        restaurants, takes orders, sends payment links by SMS, and pushes
        orders into the restaurant&rsquo;s point-of-sale (&ldquo;POS&rdquo;).
        Features, AI behavior, and integrations may change over time.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You must provide accurate information to sign up and keep your
        credentials confidential. You are responsible for everything that
        happens under your account. You must be authorized to bind the
        restaurant or business you sign up on behalf of.
      </p>

      <h2>3. Subscription and fees</h2>
      <ul>
        <li>
          OMRI is offered on a monthly or annual subscription. Current pricing
          appears on the OMRI website or in your order form.
        </li>
        <li>
          Fees are billed in advance and are non-refundable except where
          required by law. You authorize us (through our payment processor,
          Stripe) to charge your payment method on each renewal until you
          cancel.
        </li>
        <li>
          <strong>Telephony pass-through:</strong> call minutes, SMS segments,
          and phone-number rental may be billed at cost or at a published
          markup in addition to the subscription.
        </li>
        <li>
          Taxes are your responsibility unless we are legally required to
          collect them.
        </li>
      </ul>

      <h2>4. Free trials and demos</h2>
      <p>
        If we offer you a free trial or a live demo, it is provided as-is for
        evaluation only. We may modify or end it at any time. Any data created
        during a trial may be deleted if you do not convert to a paid
        subscription.
      </p>

      <h2>5. Your content and your customers</h2>
      <p>
        You retain ownership of your menu, recordings, call transcripts, and
        order data (&ldquo;Customer Data&rdquo;). You grant OMRI a
        non-exclusive, worldwide license to use Customer Data solely to
        provide and improve the Service. You represent that you have all
        rights and consents required to use Customer Data with the Service,
        including to record calls where your jurisdiction requires notice or
        consent.
      </p>

      <h2>6. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service to send unsolicited marketing SMS or robocalls.</li>
        <li>Violate any law, including TCPA, CAN-SPAM, and CPRA/CCPA.</li>
        <li>Interfere with the Service, probe for vulnerabilities, or circumvent rate limits.</li>
        <li>Resell or white-label the Service without a written agreement with OMRI.</li>
        <li>Use the Service to take orders for regulated goods you are not licensed to sell.</li>
      </ul>

      <h2>7. Integrations and third parties</h2>
      <p>
        OMRI connects to third-party services you authorize (for example,
        Clover, Square, Toast, SpotOn, Stripe, Twilio, GoHighLevel, Retell,
        OpenAI, Google). Your use of those services is governed by their own
        terms. OMRI is not responsible for outages, errors, or changes in
        third-party services.
      </p>

      <h2>8. Service levels</h2>
      <p>
        We work hard to keep the Service available, but we do not guarantee
        uninterrupted operation. Planned maintenance will be announced when
        practical. Beta features are clearly labeled and offered without
        warranty.
      </p>

      <h2>9. Intellectual property</h2>
      <p>
        OMRI and its licensors own the Service, including all software,
        models, dashboards, and trademarks. We grant you a limited,
        non-exclusive, non-transferable right to use the Service during your
        subscription. No rights are granted to you by implication.
      </p>

      <h2>10. Confidentiality</h2>
      <p>
        Each party will protect the other&rsquo;s non-public information with
        at least the same care it uses for its own confidential information,
        and not use or disclose it except to provide or use the Service.
      </p>

      <h2>11. Termination</h2>
      <p>
        You may cancel your subscription at any time from your dashboard or by
        emailing <a href="mailto:hello@omriapp.com">hello@omriapp.com</a>.
        Cancellation takes effect at the end of the current billing period. We
        may suspend or terminate your access for material breach, non-payment,
        or illegal activity, with notice where practical.
      </p>
      <p>
        Upon termination, your access to the dashboard will end. We will
        retain Customer Data for up to 90 days so you can export it, then
        delete it, unless law requires longer retention.
      </p>

      <h2>12. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
        AVAILABLE.&rdquo; TO THE MAXIMUM EXTENT PERMITTED BY LAW, OMRI
        DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY,
        FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT
        WARRANT THAT THE SERVICE WILL BE ERROR-FREE, THAT AI RESPONSES WILL BE
        ACCURATE IN EVERY CASE, OR THAT DATA WILL NEVER BE LOST.
      </p>

      <h2>13. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER PARTY WILL BE LIABLE
        FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
        OR FOR LOST PROFITS OR REVENUES. EACH PARTY&rsquo;S TOTAL LIABILITY
        ARISING OUT OF OR RELATED TO THESE TERMS WILL NOT EXCEED THE AMOUNTS
        YOU PAID TO OMRI IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING
        RISE TO THE CLAIM.
      </p>

      <h2>14. Indemnification</h2>
      <p>
        You will defend, indemnify, and hold harmless OMRI from any
        third-party claim arising out of (a) Customer Data, (b) your use of
        the Service in violation of these Terms, or (c) your failure to
        provide required disclosures to end callers.
      </p>

      <h2>15. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of the State of California,
        without regard to its conflict-of-laws rules. The state and federal
        courts located in Stanislaus County, California, will have exclusive
        jurisdiction over any dispute, except that either party may seek
        injunctive relief in any court of competent jurisdiction.
      </p>

      <h2>16. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. If a change is material
        we will notify you by email or in-product. Your continued use of the
        Service after the effective date of a change means you accept the new
        Terms.
      </p>

      <h2>17. Miscellaneous</h2>
      <p>
        These Terms are the entire agreement between you and OMRI about the
        Service. If a provision is unenforceable, the rest will remain in
        effect. Failure to enforce a provision is not a waiver. You may not
        assign these Terms without our written consent; we may assign them in
        connection with a merger, acquisition, or sale of assets.
      </p>

      <h2>18. Contact</h2>
      <p>
        OMRI AI, Inc. &middot; Modesto, California, USA <br />
        Email: <a href="mailto:hello@omriapp.com">hello@omriapp.com</a>
      </p>
    </LegalLayout>
  );
}
