export default function PrivacyPage() {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-violet-400 font-semibold tracking-widest uppercase mb-4">Legal</p>
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-slate-400 text-sm mb-12">Last updated: March 11, 2026</p>
  
          <div className="prose prose-invert prose-violet max-w-none">
  
            {/* 1. INTRODUCTION */}
            <h2>1. Introduction</h2>
            <p>
              Welcome to <strong>Uneedes</strong> ("Company", "we", "us", or "our"). We operate the web application
              available at <a href="https://uneedes.vercel.app" target="_blank" rel="noopener noreferrer">https://uneedes.vercel.app</a> (the "Service").
            </p>
            <p>
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you
              use our Service. Please read this policy carefully. If you disagree with its terms, please discontinue
              use of the Service immediately.
            </p>
            <p>
              This policy applies to all users worldwide. Where applicable, it also complies with the{" "}
              <strong>EU General Data Protection Regulation (GDPR)</strong>, the{" "}
              <strong>California Consumer Privacy Act (CCPA)</strong>, and the{" "}
              <strong>Children's Online Privacy Protection Act (COPPA)</strong>.
            </p>
  
            {/* 2. DATA CONTROLLER */}
            <h2>2. Data Controller</h2>
            <p>
              The data controller responsible for your personal data is:
            </p>
            <ul>
              <li><strong>Company:</strong> Uneedes</li>
              <li><strong>Website:</strong> https://uneedes.vercel.app</li>
              <li><strong>Contact:</strong> <a href="mailto:legal@uneedes.com">legal@uneedes.com</a></li>
            </ul>
            <p>
              For all privacy-related inquiries, including GDPR or CCPA requests, please contact us at the address above.
            </p>
  
            {/* 3. INFORMATION WE COLLECT */}
            <h2>3. Information We Collect</h2>
            <p>We may collect the following categories of personal information:</p>
  
            <h3>3.1 Information You Provide Directly</h3>
            <ul>
              <li>
                <strong>Account Registration:</strong> Name, email address, username, and password when you create
                an account.
              </li>
              <li>
                <strong>Contact Forms:</strong> Name, email address, and any message content you submit through
                our contact forms.
              </li>
              <li>
                <strong>Payment Information:</strong> Billing name, billing address, and payment card details.
                All payment transactions are processed by <strong>Stripe, Inc.</strong> We do not store full
                credit card numbers or CVV codes on our servers. Stripe's privacy policy is available at{" "}
                <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">https://stripe.com/privacy</a>.
              </li>
              <li>
                <strong>Profile Data:</strong> Any additional information you voluntarily add to your account profile.
              </li>
            </ul>
  
            <h3>3.2 Information Collected Automatically</h3>
            <ul>
              <li>
                <strong>Log Data:</strong> IP address, browser type and version, operating system, referring URL,
                pages visited, and timestamps.
              </li>
              <li>
                <strong>Device Information:</strong> Hardware model, operating system version, unique device identifiers.
              </li>
              <li>
                <strong>Usage Data:</strong> Features used, actions taken, session duration, and interaction patterns
                within the Service.
              </li>
              <li>
                <strong>Cookies and Tracking Technologies:</strong> See Section 7 (Cookies) for details.
              </li>
            </ul>
  
            <h3>3.3 Information from Third Parties</h3>
            <p>
              We may receive information about you from third-party services you connect to our platform, or from
              analytics providers, in accordance with their respective privacy policies.
            </p>
  
            {/* 4. HOW WE USE YOUR INFORMATION */}
            <h2>4. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul>
              <li>To create and manage your account;</li>
              <li>To provide, operate, and maintain the Service;</li>
              <li>To process payments and manage subscriptions via Stripe;</li>
              <li>To send transactional emails (e.g., account confirmation, invoices, password resets);</li>
              <li>To send service-related communications and updates;</li>
              <li>To respond to your inquiries and support requests;</li>
              <li>To analyze usage trends and improve the Service;</li>
              <li>To detect, prevent, and address technical issues, fraud, or abuse;</li>
              <li>To comply with applicable legal obligations;</li>
              <li>To enforce our Terms and Conditions.</li>
            </ul>
            <p>
              We do <strong>not</strong> sell, rent, or trade your personal information to third parties for their
              marketing purposes.
            </p>
  
            {/* 5. LEGAL BASIS FOR PROCESSING (GDPR) */}
            <h2>5. Legal Basis for Processing (GDPR)</h2>
            <p>
              If you are located in the European Economic Area (EEA) or United Kingdom, our legal basis for
              collecting and using your personal data is as follows:
            </p>
            <ul>
              <li>
                <strong>Contract Performance:</strong> Processing is necessary to provide the Service to you,
                including account management and payment processing.
              </li>
              <li>
                <strong>Legitimate Interests:</strong> To improve the Service, ensure security, and prevent fraud,
                where these interests are not overridden by your rights.
              </li>
              <li>
                <strong>Legal Obligation:</strong> Where we are required to process data to comply with applicable law.
              </li>
              <li>
                <strong>Consent:</strong> Where you have provided explicit consent, such as for optional marketing
                communications or non-essential cookies. You may withdraw consent at any time.
              </li>
            </ul>
  
            {/* 6. DATA SHARING AND THIRD PARTIES */}
            <h2>6. Data Sharing and Third Parties</h2>
            <p>
              We may share your information with the following categories of third parties, strictly on a need-to-know basis:
            </p>
            <ul>
              <li>
                <strong>Stripe, Inc.</strong> — Payment processing. Stripe may collect and process payment card
                data as an independent data controller. Please review Stripe's Privacy Policy at stripe.com/privacy.
              </li>
              <li>
                <strong>Google LLC (Google Analytics)</strong> — Analytics and usage tracking. Google Analytics
                collects anonymized data about how users interact with the Service. You can opt out via{" "}
                <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">
                  Google's opt-out tool
                </a>.
              </li>
              <li>
                <strong>Hosting Providers (Vercel, Inc.)</strong> — Infrastructure and hosting. Vercel may process
                certain technical data as part of delivering our Service.
              </li>
              <li>
                <strong>Legal and Regulatory Authorities:</strong> We may disclose your data if required by law,
                court order, or governmental authority.
              </li>
            </ul>
            <p>
              All third-party service providers are contractually required to handle your data in accordance with
              applicable data protection laws and our instructions.
            </p>
  
            {/* 7. COOKIES */}
            <h2>7. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar tracking technologies to enhance your experience, analyze traffic, and
              understand usage of the Service.
            </p>
  
            <h3>7.1 Types of Cookies We Use</h3>
            <ul>
              <li>
                <strong>Strictly Necessary Cookies:</strong> Required for the Service to function (e.g., session
                management, authentication). These cannot be disabled.
              </li>
              <li>
                <strong>Analytics Cookies:</strong> Used to collect aggregated, anonymized data about how users
                interact with the Service (e.g., Google Analytics).
              </li>
              <li>
                <strong>Preference Cookies:</strong> Used to remember your settings and preferences.
              </li>
            </ul>
  
            <h3>7.2 Managing Cookies</h3>
            <p>
              You can control and manage cookies through your browser settings. Disabling certain cookies may
              affect the functionality of the Service. For more information, visit{" "}
              <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer">allaboutcookies.org</a>.
            </p>
  
            {/* 8. DATA RETENTION */}
            <h2>8. Data Retention</h2>
            <p>
              We retain your personal data only for as long as necessary to fulfill the purposes described in this
              policy, or as required by applicable law:
            </p>
            <ul>
              <li>
                <strong>Account data</strong> is retained for the duration of your account and for up to{" "}
                <strong>3 years</strong> after deletion, to comply with legal and accounting obligations.
              </li>
              <li>
                <strong>Payment records</strong> are retained for a minimum of <strong>7 years</strong> for tax
                and financial compliance purposes.
              </li>
              <li>
                <strong>Log data</strong> is retained for up to <strong>12 months</strong>.
              </li>
              <li>
                <strong>Contact form submissions</strong> are retained for up to <strong>2 years</strong>.
              </li>
            </ul>
            <p>
              After the applicable retention period, data is securely deleted or anonymized.
            </p>
  
            {/* 9. YOUR RIGHTS */}
            <h2>9. Your Privacy Rights</h2>
  
            <h3>9.1 GDPR Rights (EEA/UK Users)</h3>
            <p>If you are located in the EEA or UK, you have the following rights:</p>
            <ul>
              <li><strong>Right of Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your personal data ("right to be forgotten"),
                subject to legal retention requirements.</li>
              <li><strong>Right to Restriction:</strong> Request that we restrict the processing of your data.</li>
              <li><strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format.</li>
              <li><strong>Right to Object:</strong> Object to processing based on legitimate interests or for direct marketing.</li>
              <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time without affecting prior lawful processing.</li>
            </ul>
            <p>
              To exercise these rights, contact us at <a href="mailto:legal@uneedes.com">legal@uneedes.com</a>. We
              will respond within <strong>30 days</strong>. You also have the right to lodge a complaint with your
              local supervisory authority (e.g., Garante della Privacy in Italy, ICO in the UK).
            </p>
  
            <h3>9.2 CCPA Rights (California Residents)</h3>
            <p>California residents have the right to:</p>
            <ul>
              <li>Know what personal information is collected, used, disclosed, or sold;</li>
              <li>Request deletion of personal information;</li>
              <li>Opt out of the sale of personal information (we do not sell personal information);</li>
              <li>Non-discrimination for exercising these rights.</li>
            </ul>
            <p>
              To submit a CCPA request, contact us at <a href="mailto:legal@uneedes.com">legal@uneedes.com</a>.
            </p>
  
            {/* 10. CHILDREN'S PRIVACY */}
            <h2>10. Children's Privacy</h2>
            <p>
              Our Service is accessible to users aged <strong>13 and older</strong>. We do not knowingly collect
              personal information from children under 13. Users between the ages of 13 and 17 ("Minors") may
              access the Service with the <strong>consent and oversight of a parent or legal guardian</strong>.
            </p>
            <p>
              By registering an account on behalf of a Minor, the parent or guardian confirms they have reviewed
              and accepted this Privacy Policy and our Terms and Conditions on the Minor's behalf.
            </p>
            <p>
              If we become aware that we have inadvertently collected personal data from a child under 13 without
              verifiable parental consent, we will take immediate steps to delete such information. Please contact
              us at <a href="mailto:legal@uneedes.com">legal@uneedes.com</a> if you believe we have collected
              information from a child under 13.
            </p>
  
            {/* 11. INTERNATIONAL TRANSFERS */}
            <h2>11. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries outside your country of residence,
              including the United States, where data protection laws may differ. When transferring data from the
              EEA or UK, we ensure appropriate safeguards are in place, including:
            </p>
            <ul>
              <li>Standard Contractual Clauses (SCCs) approved by the European Commission;</li>
              <li>Adequacy decisions where applicable;</li>
              <li>Data Processing Agreements with all relevant sub-processors.</li>
            </ul>
  
            {/* 12. SECURITY */}
            <h2>12. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your personal data, including:
            </p>
            <ul>
              <li>TLS/SSL encryption for all data in transit;</li>
              <li>Encrypted storage for sensitive data at rest;</li>
              <li>Access controls and authentication requirements;</li>
              <li>Regular security reviews and vulnerability assessments.</li>
            </ul>
            <p>
              However, no method of transmission over the internet or electronic storage is 100% secure. While
              we strive to use commercially acceptable means to protect your data, we cannot guarantee absolute security.
            </p>
  
            {/* 13. LINKS TO THIRD-PARTY SITES */}
            <h2>13. Links to Third-Party Websites</h2>
            <p>
              Our Service may contain links to third-party websites or services. We are not responsible for the
              privacy practices of those websites. We encourage you to review the privacy policies of any
              third-party sites you visit.
            </p>
  
            {/* 14. CHANGES */}
            <h2>14. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology,
              legal requirements, or other factors. When we do, we will revise the "Last updated" date at the top
              of this page. If changes are material, we will notify you via email or a prominent notice within
              the Service at least <strong>30 days</strong> before the change takes effect. Your continued use
              of the Service after the effective date constitutes acceptance of the updated policy.
            </p>
  
            {/* 15. CONTACT */}
            <h2>15. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us:
            </p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:legal@uneedes.com">legal@uneedes.com</a></li>
              <li><strong>Website:</strong> <a href="https://uneedes.vercel.app" target="_blank" rel="noopener noreferrer">https://uneedes.vercel.app</a></li>
            </ul>
            <p>
              We are committed to working with you to resolve any privacy concerns fairly and promptly.
            </p>
  
          </div>
        </div>
      </div>
    );
  }
  