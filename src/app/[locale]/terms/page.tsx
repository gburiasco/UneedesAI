import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  
  return {
    title: t('termsTitle'),
    description: t('termsDescription'),
    alternates: {
      canonical: `https://uneedes.vercel.app/${locale}/terms`
    },
    robots: {
      index: true,  // ✅ Indicizza
      follow: true
    }
  };
}

export default function TermsPage() {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-violet-400 font-semibold tracking-widest uppercase mb-4">Legal</p>
          <h1 className="text-4xl font-bold mb-2">Terms and Conditions</h1>
          <p className="text-slate-400 text-sm mb-12">Last updated: March 11, 2026</p>
  
          <div className="prose prose-invert prose-violet max-w-none">
  
            {/* 1. ACCEPTANCE */}
            <h2>1. Acceptance of Terms</h2>
            <p>
              These Terms and Conditions ("Terms") constitute a legally binding agreement between you ("User",
              "you", or "your") and <strong>Uneedes</strong> ("Company", "we", "us", or "our") governing your
              access to and use of the web application available at{" "}
              <a href="https://uneedes.vercel.app" target="_blank" rel="noopener noreferrer">https://uneedes.vercel.app</a>{" "}
              and all associated services (collectively, the "Service").
            </p>
            <p>
              By accessing or using the Service, creating an account, or clicking "I agree", you confirm that you
              have read, understood, and agree to be bound by these Terms and our{" "}
              <a href="/privacy">Privacy Policy</a>, which is incorporated herein by reference.
            </p>
            <p>
              If you do not agree to these Terms, you must not access or use the Service.
            </p>
  
            {/* 2. ELIGIBILITY */}
            <h2>2. Eligibility</h2>
            <p>
              To use the Service, you must be at least <strong>13 years of age</strong>. Users between the ages
              of 13 and 17 ("Minors") may only use the Service with the explicit consent and under the supervision
              of a parent or legal guardian. By registering an account for or on behalf of a Minor, the parent or
              guardian agrees to these Terms on the Minor's behalf and accepts full responsibility for the Minor's
              use of the Service.
            </p>
            <p>
              If you are accessing the Service on behalf of a company or other legal entity, you represent that
              you have the authority to bind that entity to these Terms.
            </p>
  
            {/* 3. ACCOUNT REGISTRATION */}
            <h2>3. Account Registration</h2>
            <p>
              To access certain features of the Service, you must create an account. You agree to:
            </p>
            <ul>
              <li>Provide accurate, current, and complete information during registration;</li>
              <li>Maintain and promptly update your account information;</li>
              <li>Keep your password secure and confidential;</li>
              <li>Not share your account credentials with any third party;</li>
              <li>Notify us immediately at <a href="mailto:legal@uneedes.com">legal@uneedes.com</a> of any
                unauthorized use of your account or any other security breach.</li>
            </ul>
            <p>
              You are solely responsible for all activity that occurs under your account. We reserve the right to
              suspend or terminate accounts that are found to contain false or misleading information.
            </p>
  
            {/* 4. SERVICE DESCRIPTION */}
            <h2>4. Description of the Service</h2>
            <p>
              Uneedes is a SaaS (Software as a Service) web application. The Service is provided on a
              subscription basis and is offered in the following tiers:
            </p>
            <ul>
              <li>
                <strong>Free Plan:</strong> Access to a limited set of features at no cost. The Free Plan may
                have usage caps and does not include all functionality available to paid subscribers.
              </li>
              <li>
                <strong>Paid Plans:</strong> Access to full or expanded features in exchange for a recurring
                subscription fee, billed in accordance with the pricing plan selected at the time of purchase.
              </li>
            </ul>
            <p>
              We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time,
              with reasonable notice where practicable.
            </p>
  
            {/* 5. SUBSCRIPTIONS AND PAYMENTS */}
            <h2>5. Subscriptions and Payments</h2>
  
            <h3>5.1 Billing</h3>
            <p>
              Paid plans are billed on a recurring basis (monthly or annually, as selected). By subscribing to
              a paid plan, you authorize us to charge the applicable fees to your payment method through our
              payment processor, <strong>Stripe, Inc.</strong>, at the start of each billing cycle.
            </p>
  
            <h3>5.2 Free Trials</h3>
            <p>
              We may offer free trials at our discretion. At the end of a free trial period, your account will
              automatically convert to the selected paid plan unless you cancel prior to the trial's expiration.
            </p>
  
            <h3>5.3 Price Changes</h3>
            <p>
              We reserve the right to change subscription prices at any time. We will provide at least{" "}
              <strong>30 days' notice</strong> before any price change takes effect. Your continued use of the
              Service after the effective date of a price change constitutes your agreement to the new pricing.
            </p>
  
            <h3>5.4 Cancellation</h3>
            <p>
              You may cancel your subscription at any time from your account settings. Cancellation takes effect
              at the end of the current billing period. No partial refunds are issued for unused time within a
              billing cycle, except where required by applicable law.
            </p>
  
            <h3>5.5 Refunds</h3>
            <p>
              All purchases are generally non-refundable except where required by law. If you believe you have
              been charged in error, please contact us at{" "}
              <a href="mailto:legal@uneedes.com">legal@uneedes.com</a> within{" "}
              <strong>14 days</strong> of the charge, and we will review your request in good faith.
            </p>
  
            <h3>5.6 Failed Payments</h3>
            <p>
              If a payment fails, we will attempt to process it again. If payment remains unsuccessful after
              reasonable attempts, we reserve the right to downgrade your account to the Free Plan or suspend
              access until payment is resolved.
            </p>
  
            {/* 6. ACCEPTABLE USE */}
            <h2>6. Acceptable Use Policy</h2>
            <p>You agree to use the Service only for lawful purposes. You must not:</p>
            <ul>
              <li>Violate any applicable local, national, or international law or regulation;</li>
              <li>Infringe upon the intellectual property rights of others;</li>
              <li>Transmit or upload any content that is unlawful, defamatory, obscene, or harassing;</li>
              <li>Attempt to gain unauthorized access to any part of the Service or its infrastructure;</li>
              <li>Introduce viruses, malware, or other malicious code;</li>
              <li>Use automated bots, scrapers, or scripts to access the Service in a manner that imposes
                an unreasonable load on our infrastructure;</li>
              <li>Resell, sublicense, or distribute the Service without our prior written consent;</li>
              <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity;</li>
              <li>Engage in any activity that disrupts or interferes with other users' access to the Service.</li>
            </ul>
            <p>
              We reserve the right to investigate and take appropriate action, including suspension or termination
              of accounts, for any violation of this Acceptable Use Policy.
            </p>
  
            {/* 7. INTELLECTUAL PROPERTY */}
            <h2>7. Intellectual Property</h2>
  
            <h3>7.1 Our Content</h3>
            <p>
              All content, features, and functionality of the Service — including but not limited to text,
              graphics, logos, icons, source code, and software — are the exclusive property of Uneedes and
              its licensors, and are protected by applicable copyright, trademark, and other intellectual
              property laws. You may not copy, modify, distribute, or create derivative works from our
              content without our express written permission.
            </p>
  
            <h3>7.2 Your Content</h3>
            <p>
              You retain ownership of any content you submit, upload, or create through the Service ("User
              Content"). By submitting User Content, you grant Uneedes a non-exclusive, worldwide, royalty-free
              license to use, reproduce, and display your User Content solely for the purpose of operating
              and improving the Service. We do not claim ownership of your data.
            </p>
  
            <h3>7.3 Feedback</h3>
            <p>
              If you provide us with feedback, suggestions, or ideas regarding the Service, you grant us
              an irrevocable, royalty-free license to use such feedback for any purpose without compensation to you.
            </p>
  
            {/* 8. PRIVACY */}
            <h2>8. Privacy</h2>
            <p>
              Your use of the Service is also governed by our{" "}
              <a href="/privacy">Privacy Policy</a>. Please review it carefully to understand how we collect,
              use, and protect your information.
            </p>
  
            {/* 9. THIRD-PARTY SERVICES */}
            <h2>9. Third-Party Services</h2>
            <p>
              The Service integrates with third-party services, including <strong>Stripe</strong> for payment
              processing and <strong>Google Analytics</strong> for usage analytics. Your use of these
              third-party services is subject to their respective terms of service and privacy policies.
              We are not responsible for the practices of these third parties.
            </p>
  
            {/* 10. DISCLAIMERS */}
            <h2>10. Disclaimers</h2>
            <p>
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS
              FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR UNINTERRUPTED OR ERROR-FREE OPERATION.
            </p>
            <p>
              We do not warrant that the Service will be available at all times, that errors will be corrected,
              or that the Service is free of viruses or other harmful components. We make no warranties
              regarding the accuracy or completeness of any content available through the Service.
            </p>
  
            {/* 11. LIMITATION OF LIABILITY */}
            <h2>11. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL UNEEDES, ITS DIRECTORS,
              EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION LOSS OF PROFITS, DATA,
              GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF (OR
              INABILITY TO USE) THE SERVICE.
            </p>
            <p>
              OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO THE SERVICE
              SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE
              CLAIM, OR (B) USD $100.
            </p>
            <p>
              Some jurisdictions do not allow the exclusion or limitation of certain damages. In such
              jurisdictions, our liability is limited to the extent permitted by law.
            </p>
  
            {/* 12. INDEMNIFICATION */}
            <h2>12. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless Uneedes and its officers, directors, employees,
              and agents from and against any claims, liabilities, damages, losses, and expenses (including
              reasonable legal fees) arising from your: (a) use of the Service; (b) violation of these Terms;
              (c) violation of any third-party rights; or (d) User Content.
            </p>
  
            {/* 13. TERMINATION */}
            <h2>13. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account and access to the Service, with or
              without notice, if:
            </p>
            <ul>
              <li>You violate these Terms or our Acceptable Use Policy;</li>
              <li>We are required to do so by law;</li>
              <li>Your account has been inactive for an extended period;</li>
              <li>Continuing to provide the Service creates risk or liability for us.</li>
            </ul>
            <p>
              You may terminate your account at any time by contacting us at{" "}
              <a href="mailto:legal@uneedes.com">legal@uneedes.com</a> or using the account deletion feature
              in your settings. Upon termination, your right to use the Service ceases immediately. Sections
              7, 10, 11, 12, and 14 of these Terms survive termination.
            </p>
  
            {/* 14. GOVERNING LAW */}
            <h2>14. Governing Law and Dispute Resolution</h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable law. For users
              located in the European Union, mandatory consumer protection laws of your country of residence
              shall apply and shall not be overridden by these Terms.
            </p>
            <p>
              We encourage you to contact us first at{" "}
              <a href="mailto:legal@uneedes.com">legal@uneedes.com</a> to attempt to resolve any dispute
              informally. If a dispute cannot be resolved informally, it shall be submitted to the competent
              courts having jurisdiction over the matter.
            </p>
  
            {/* 15. CHANGES */}
            <h2>15. Changes to These Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. If we make material changes, we will
              notify you by email or by posting a prominent notice on the Service at least{" "}
              <strong>30 days</strong> before the changes take effect. Your continued use of the Service after
              the effective date of the revised Terms constitutes your acceptance of the changes. If you do
              not agree to the updated Terms, you must stop using the Service and may cancel your account.
            </p>
  
            {/* 16. ENTIRE AGREEMENT */}
            <h2>16. Entire Agreement</h2>
            <p>
              These Terms, together with our Privacy Policy and any additional agreements you enter into with
              us in connection with the Service, constitute the entire agreement between you and Uneedes
              regarding the Service, and supersede all prior or contemporaneous agreements, understandings,
              or representations.
            </p>
  
            {/* 17. SEVERABILITY */}
            <h2>17. Severability</h2>
            <p>
              If any provision of these Terms is held to be invalid, illegal, or unenforceable, such provision
              shall be modified to the minimum extent necessary to make it enforceable, and the remaining
              provisions shall continue in full force and effect.
            </p>
  
            {/* 18. CONTACT */}
            <h2>18. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us:
            </p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:legal@uneedes.com">legal@uneedes.com</a></li>
              <li><strong>Website:</strong>{" "}
                <a href="https://uneedes.vercel.app" target="_blank" rel="noopener noreferrer">
                  https://uneedes.vercel.app
                </a>
              </li>
            </ul>
  
          </div>
        </div>
      </div>
    );
  }
  