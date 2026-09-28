import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'Which route does JACXI use for Afghanistan vehicle shipping?',
    answer: 'JACXI coordinates vehicle shipping from across the USA and Canada to Afghanistan using one of two route options: through Mersin, Turkey or through UAE. The team then supports final customs and delivery inside Afghanistan.',
  },
  {
    question: 'Can you deliver outside Herat or Kabul?',
    answer: 'Yes. Herat is a primary hub, and the team supports delivery planning across all 34 Afghan provinces including Kabul, Kandahar, Mazar-i-Sharif, Jalalabad, Kunduz, and other destinations.',
  },
  {
    question: 'What details are needed for an accurate quote?',
    answer: 'Vehicle year, make, model, pickup location, destination province, title or auction details, vehicle condition, and any timing constraints help the team confirm the most accurate route and price.',
  },
  {
    question: 'Does the quote form change any shipment or dashboard data?',
    answer: 'No. The public quote form only sends your request to the JACXI team. It does not create a dashboard account, shipment record, or database workflow by itself.',
  },
  {
    question: 'Can I track a shipment after it is active?',
    answer: 'Yes. The public site links to shipment tracking, and active customers can receive milestone updates as the vehicle moves through pickup, port, transit, customs, and delivery stages.',
  },
];

export default function FAQSection() {
  return (
    <section id="faq" className="relative overflow-hidden bg-[var(--background)] py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-bold uppercase text-[var(--accent-gold)]">FAQ</p>
          <h2 className="mt-4 text-4xl font-black leading-tight text-[var(--text-primary)] sm:text-5xl">
            Clear answers before you ship.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
            The common questions customers ask before moving vehicles from the USA and Canada to Afghanistan.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {faqs.map((faq, index) => (
            <details
              key={faq.question}
              className="group rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm open:border-[rgba(var(--accent-gold-rgb),0.48)]"
              open={index === 0}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-black text-[var(--text-primary)]">
                {faq.question}
                <ChevronDown className="h-5 w-5 shrink-0 text-[var(--accent-gold)] transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
