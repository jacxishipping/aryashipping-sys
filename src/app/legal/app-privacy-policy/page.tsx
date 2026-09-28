import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jacxi Shipping App Privacy Policy",
  description:
    "Privacy policy for the Jacxi Shipping mobile application.",
  robots: {
    index: false,
    follow: false,
  },
};

const lastUpdated = "July 12, 2026";

export default function AppPrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-24 text-[var(--text-primary)] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Jacxi Shipping Mobile App Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-black/60">Last updated: {lastUpdated}</p>

        <section className="mt-8 space-y-4 text-sm leading-7 text-black/80 sm:text-base">
          <p>
            Jacxi Shipping ("we", "our", or "us") values your privacy. This Privacy
            Policy explains how we collect, use, store, and protect information when
            you use the Jacxi Shipping mobile application.
          </p>
          <p>
            By using the app, you agree to the collection and use of information in
            accordance with this policy.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">1. Information We Collect</h2>
          <ul className="list-disc space-y-2 pl-6 text-sm leading-7 text-black/80 sm:text-base">
            <li>
              Account details such as name, email address, role, and login credentials.
            </li>
            <li>
              Shipment-related data including tracking numbers, VINs, container
              references, and invoice information.
            </li>
            <li>
              Device and usage data such as app version, platform type, and diagnostic
              logs used to improve service quality.
            </li>
            <li>
              Notification preferences and push notification tokens, where enabled.
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">2. How We Use Information</h2>
          <ul className="list-disc space-y-2 pl-6 text-sm leading-7 text-black/80 sm:text-base">
            <li>Provide shipment tracking, container status, and invoice features.</li>
            <li>Authenticate users and secure access to role-based data.</li>
            <li>Send operational alerts and account notifications.</li>
            <li>
              Maintain service reliability, detect abuse, and improve app performance.
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">3. Data Sharing</h2>
          <p className="text-sm leading-7 text-black/80 sm:text-base">
            We do not sell your personal information. We may share data only with
            trusted service providers and partners as required to operate shipping,
            tracking, communication, hosting, or compliance workflows.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">4. Data Security</h2>
          <p className="text-sm leading-7 text-black/80 sm:text-base">
            We use reasonable administrative, technical, and organizational safeguards
            to protect your information. While we work to secure all systems, no
            method of transmission or storage is completely risk-free.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">5. Data Retention</h2>
          <p className="text-sm leading-7 text-black/80 sm:text-base">
            We retain information for as long as needed to provide our services,
            comply with legal obligations, resolve disputes, and enforce agreements.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">6. Your Rights</h2>
          <p className="text-sm leading-7 text-black/80 sm:text-base">
            Depending on your location, you may have rights to access, correct, or
            request deletion of your personal information. You may also request
            details about how your data is processed.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">7. Children&apos;s Privacy</h2>
          <p className="text-sm leading-7 text-black/80 sm:text-base">
            The app is not intended for children under the age of 13, and we do not
            knowingly collect personal data from children.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">8. Policy Updates</h2>
          <p className="text-sm leading-7 text-black/80 sm:text-base">
            We may update this Privacy Policy from time to time. Changes are posted on
            this page with a revised last updated date.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">9. Contact</h2>
          <p className="text-sm leading-7 text-black/80 sm:text-base">
            For privacy-related questions, contact us at support@jacxishipping.com.
          </p>
        </section>
      </div>
    </main>
  );
}
