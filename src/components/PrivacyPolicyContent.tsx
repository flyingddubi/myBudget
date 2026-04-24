import { useI18n } from "../i18n";

export function PrivacyPolicyContent() {
  const { messages } = useI18n();
  const privacy = messages.settings.privacy;

  return (
    <div className="space-y-5 text-[15px] leading-7 text-slate-700">
      <div>
        <h3 className="text-lg font-bold text-slate-900">{messages.settings.privacyTitle}</h3>
        <p className="mt-3">{privacy.intro}</p>
      </div>

      {privacy.sections.map((section, index) => (
        <div key={section.title}>
          <h4 className="font-bold text-slate-900">{section.title}</h4>
          <div className="mt-2 space-y-2">
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {"bullets" in section && section.bullets ? (
              <ul className="list-disc space-y-1 pl-5 text-slate-700">
                {section.bullets.map((bullet: string) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
            {index === 1 ? (
              <p>
                {privacy.detailLink}
                <br />
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-indigo-600 underline underline-offset-2"
                >
                  https://policies.google.com/privacy
                </a>
              </p>
            ) : null}
          </div>
        </div>
      ))}

      <div>
        <h4 className="font-bold text-slate-900">{privacy.inquiryTitle}</h4>
        <div className="mt-2 space-y-2">
          <p>{privacy.inquiryBody}</p>
          <p>{privacy.developer}</p>
          <p>
            {privacy.emailLabel}{" "}
            <a
              href="mailto:flyingcompany.ko.tw@gmail.com"
              className="font-semibold text-indigo-600 underline underline-offset-2"
            >
              flyingcompany.ko.tw@gmail.com
            </a>
          </p>
        </div>
      </div>

      <div className="rounded-[20px] bg-slate-50 px-4 py-4">
        <p className="text-sm font-semibold text-slate-500">{privacy.lastUpdated}</p>
        <p className="mt-1 font-bold text-slate-900">{privacy.lastUpdatedValue}</p>
      </div>
    </div>
  );
}
