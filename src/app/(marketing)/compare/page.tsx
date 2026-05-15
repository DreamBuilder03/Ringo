import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Works with your POS — OMRI",
  description:
    "OMRI works with every restaurant, regardless of POS. Square, Clover, Toast, SpotOn, Little Caesars, Domino's, ghost kitchens — see how we fit into your operation.",
};

// ──────────────────────────────────────────────────────────────────────────────
// /compare — public-facing POS coverage page.
//
// The audience is a restaurant owner trying to figure out "will this work with
// my POS?" Not an engineer. Plain language only, no jargon, no tier numbers
// in user-facing copy.
//
// Companion to docs/pos-coverage.md (the internal engineering version).
//
// Brand system: Obsidian + Bone monochrome, Fraunces display + Inter body.
// Pure server component — no client interactivity needed.
// ──────────────────────────────────────────────────────────────────────────────

interface ComparisonTier {
  label: string;
  headline: string;
  subhead: string;
  customerExperience: string;
  operatorExperience: string;
  whoItsFor: string;
}

const TIERS: ComparisonTier[] = [
  {
    label: "Native integration",
    headline: "Orders flow straight into your POS.",
    subhead: "Zero staff intervention.",
    customerExperience:
      "Customer calls. OMRI answers. Takes the order. Sends an SMS payment link. Once they pay, the order is in your POS queue before they've put their phone down.",
    operatorExperience:
      "You do nothing. The ticket prints. The customer arrives. Done.",
    whoItsFor: "Square, Clover, Toast (pending), and any POS we've directly integrated with.",
  },
  {
    label: "Tablet handoff",
    headline: "Orders appear on a tablet at your counter.",
    subhead: "One re-entry step. No missed calls.",
    customerExperience:
      "Customer calls. OMRI answers. Takes the order. Sends the SMS payment link. Once they pay, the structured order appears on a tablet at your counter in real time.",
    operatorExperience:
      "Your staff reads the order off the tablet and types it into your POS. Cleaner than scribbling on paper. Faster than answering the phone yourself.",
    whoItsFor:
      "Any restaurant whose POS we haven't directly integrated with yet — or any restaurant that prefers a manual confirmation step before kitchen-fire.",
  },
  {
    label: "Print or text handoff",
    headline: "Orders print to your kitchen — or text your staff.",
    subhead: "Works with any kitchen printer or phone.",
    customerExperience:
      "Customer calls. OMRI answers. Takes the order. Sends the SMS payment link. Once they pay, OMRI prints the ticket directly to your kitchen printer or texts it to a designated staff phone.",
    operatorExperience:
      "Your staff sees the ticket the same way they'd see any other paper ticket today, then enters it in your POS as part of their normal workflow.",
    whoItsFor:
      "Franchisees on proprietary corporate POS systems — Little Caesars (Caesar Vision Cloud), Domino's (PULSE), Wingstop, Papa John's, Jet's, anything where corporate locks you out of third-party integrations. We work, where most AI products can't.",
  },
  {
    label: "Voice-only",
    headline: "We answer your phone. You handle the rest.",
    subhead: "For restaurants without a POS — or who just want the calls.",
    customerExperience:
      "Customer calls. OMRI answers. Takes the order. Confirms it back. You get a clean SMS summary of every order.",
    operatorExperience:
      "You receive the order summary via SMS or email. Enter it however you normally do — paper, POS, whiteboard, doesn't matter. OMRI just makes sure no call goes unanswered.",
    whoItsFor:
      "Ghost kitchens, food trucks, mom-and-pop spots on paper tickets, or any restaurant that just needs the phone answered.",
  },
];

interface PosStatus {
  name: string;
  status: string;
  note: string;
}

const POS_STATUS: PosStatus[] = [
  { name: "Square", status: "Live today", note: "Native integration. Sign up and you're running in 48 hours." },
  { name: "Clover", status: "Live today", note: "Native integration. Sign up and you're running in 48 hours." },
  { name: "Toast", status: "Coming soon", note: "We've applied to Toast's partner program. Sign up now on Tablet Handoff, we auto-upgrade you to Native the moment Toast approves us." },
  { name: "SpotOn", status: "Coming soon", note: "Partner application in progress." },
  { name: "Little Caesars (Caesar Vision Cloud)", status: "Live today via Print Handoff", note: "Corporate locks out third-party integrations, so we work via your kitchen printer." },
  { name: "Domino's (PULSE)", status: "Live today via Print Handoff", note: "Same as Little Caesars — corporate-locked, so we use your kitchen printer." },
  { name: "Wingstop / Papa John's / Jet's / other proprietary", status: "Live today via Print Handoff", note: "If corporate locks out APIs, we use your printer or a staff phone." },
  { name: "Any other cloud POS (Lightspeed, Revel, Lavu, etc.)", status: "Live today via Tablet Handoff", note: "Works with any POS that runs on a tablet or computer." },
  { name: "No POS at all", status: "Live today via Voice-only", note: "We answer, take the order, summarize. You handle entry however you normally do." },
];

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-obsidian text-bone">
      {/* Hero */}
      <section className="relative px-6 pt-24 pb-16 sm:px-12 sm:pt-32 sm:pb-24">
        <div className="mx-auto max-w-5xl">
          <div className="eyebrow mb-6 text-stone">POS coverage</div>
          <h1 className="font-serif text-5xl leading-[1.05] tracking-tight sm:text-7xl">
            <span className="italic">OMRI works</span>
            <br />
            with every restaurant.
          </h1>
          <p className="mt-8 max-w-2xl font-sans text-lg leading-relaxed text-chalk">
            Square, Clover, Toast, Little Caesars, ghost kitchens, food trucks — every operation is built on a different stack. OMRI is the only AI voice product designed to fit yours, whatever it is. The voice agent stays the same. Only how the order reaches your kitchen changes.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/demo"
              className="rounded-full bg-bone px-7 py-3 font-sans text-base font-medium text-obsidian transition hover:bg-chalk active:scale-[0.98]"
            >
              Try the live demo →
            </Link>
            <Link
              href="/#pricing"
              className="rounded-full border border-bone/24 px-7 py-3 font-sans text-base font-medium text-bone transition hover:border-bone/40 active:scale-[0.98]"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Four ways OMRI fits */}
      <section className="px-6 py-16 sm:px-12 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="eyebrow mb-6 text-stone">Four ways we fit</div>
          <h2 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
            The voice agent stays the same.
            <br />
            <span className="italic">Only the kitchen-side changes.</span>
          </h2>
          <p className="mt-6 max-w-2xl font-sans text-lg leading-relaxed text-chalk">
            Every restaurant gets the same OMRI on the customer call — same upsells, same Pay-Before-Prep gate, same SMS payment link. What differs is how the paid order reaches your kitchen.
          </p>

          <div className="mt-12 grid gap-4 sm:gap-6">
            {TIERS.map((tier, idx) => (
              <article
                key={tier.label}
                className="rounded-2xl border border-bone/8 bg-coal p-6 transition hover:border-bone/14 sm:p-10"
              >
                <div className="flex items-baseline gap-4">
                  <div className="font-serif text-2xl italic text-stone sm:text-3xl">
                    0{idx + 1}
                  </div>
                  <div className="eyebrow text-stone">{tier.label}</div>
                </div>
                <h3 className="mt-4 font-serif text-2xl leading-tight tracking-tight sm:text-3xl">
                  {tier.headline}
                </h3>
                <p className="mt-2 font-serif italic text-lg text-chalk sm:text-xl">
                  {tier.subhead}
                </p>

                <div className="mt-8 grid gap-6 sm:grid-cols-2 sm:gap-10">
                  <div>
                    <div className="eyebrow mb-2 text-ash">Customer experience</div>
                    <p className="font-sans text-base leading-relaxed text-chalk">
                      {tier.customerExperience}
                    </p>
                  </div>
                  <div>
                    <div className="eyebrow mb-2 text-ash">Operator experience</div>
                    <p className="font-sans text-base leading-relaxed text-chalk">
                      {tier.operatorExperience}
                    </p>
                  </div>
                </div>

                <div className="mt-8 border-t border-bone/6 pt-6">
                  <div className="eyebrow mb-2 text-ash">Who it's for</div>
                  <p className="font-sans text-base leading-relaxed text-chalk">
                    {tier.whoItsFor}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* POS-by-POS status */}
      <section className="px-6 py-16 sm:px-12 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="eyebrow mb-6 text-stone">By POS system</div>
          <h2 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
            What does OMRI look like for <span className="italic">your</span> POS?
          </h2>

          <div className="mt-12 overflow-hidden rounded-2xl border border-bone/8 bg-coal">
            <table className="w-full">
              <thead>
                <tr className="border-b border-bone/8 bg-graphite">
                  <th className="px-6 py-4 text-left font-sans text-sm font-medium uppercase tracking-wider text-stone">
                    POS system
                  </th>
                  <th className="px-6 py-4 text-left font-sans text-sm font-medium uppercase tracking-wider text-stone">
                    Status
                  </th>
                  <th className="hidden px-6 py-4 text-left font-sans text-sm font-medium uppercase tracking-wider text-stone sm:table-cell">
                    What it means for you
                  </th>
                </tr>
              </thead>
              <tbody>
                {POS_STATUS.map((row, idx) => (
                  <tr
                    key={row.name}
                    className={
                      idx === POS_STATUS.length - 1
                        ? ""
                        : "border-b border-bone/6"
                    }
                  >
                    <td className="px-6 py-5 font-sans font-medium text-bone">
                      {row.name}
                    </td>
                    <td className="px-6 py-5 font-sans text-chalk">
                      {row.status}
                    </td>
                    <td className="hidden px-6 py-5 font-sans text-chalk sm:table-cell">
                      {row.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-8 font-sans text-base leading-relaxed text-stone">
            On a POS we haven't listed? It's almost certainly Tablet Handoff or Print Handoff territory — both of which work today. Mention your POS when you book a demo and we'll confirm in the conversation.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 sm:px-12 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-4xl leading-tight tracking-tight sm:text-6xl">
            <span className="italic">Every restaurant.</span>
            <br />
            Every POS. Live in 48 hours.
          </h2>
          <p className="mt-8 font-sans text-lg leading-relaxed text-chalk">
            Tell us what POS you run when you book. We'll show you exactly how OMRI fits in your operation — and walk you through a working voice demo against your menu.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/demo"
              className="rounded-full bg-bone px-8 py-4 font-sans text-base font-medium text-obsidian transition hover:bg-chalk active:scale-[0.98]"
            >
              Book a 15-min demo →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
