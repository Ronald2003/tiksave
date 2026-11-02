import type { Metadata } from "next";
export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };
export default function ContactPage() {
  const email = process.env.CONTACT_EMAIL;
  const validEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return <div className="container content-page"><div className="page-intro"><span className="section-tag">LET’S KEEP IT CLEAR</span><h1>Get in touch.</h1><p>Questions about your library, a privacy request, or a content concern? Contact the operator of this TikSave installation.</p></div><article className="prose"><h2>Support, privacy, and content reports</h2>{validEmail ? <p>Email <a href={`mailto:${email}`}>{email}</a>. Include your video ID or TikTok URL if your request concerns a specific upload. Never send passwords, keys, or private signed URLs.</p> : <p>A support address has not been configured for this installation. The operator must add a working contact email before a public launch. No form submission is collected on this page.</p>}<h2>Reporting a rights concern</h2><p>Provide the affected video ID or TikTok URL, describe your rights or authority to act, and explain the issue. Include a contact address for a response. TikSave does not verify a TikTok association merely because a link was supplied.</p></article></div>;
}
