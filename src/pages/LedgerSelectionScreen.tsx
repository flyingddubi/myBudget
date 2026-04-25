import { useMemo } from "react";
import { useI18n } from "../i18n";

type InviteCard = {
  ownerName: string;
};

type LedgerSelectionScreenProps = {
  loading: boolean;
  busyAction: "none" | "create" | "accept";
  invite: InviteCard | null;
  errorMessage: string;
  onCreateLedger: () => void;
  onAcceptInvite: () => void;
};

function replaceName(template: string, name: string) {
  return template.replace("{{name}}", name);
}

export function LedgerSelectionScreen({
  loading,
  busyAction,
  invite,
  errorMessage,
  onCreateLedger,
  onAcceptInvite,
}: LedgerSelectionScreenProps) {
  const { messages } = useI18n();

  const inviteButtonLabel = useMemo(() => {
    if (!invite) {
      return messages.ledgerSelect.inviteEmpty;
    }

    return replaceName(messages.ledgerSelect.inviteAction, invite.ownerName);
  }, [invite, messages.ledgerSelect.inviteAction, messages.ledgerSelect.inviteEmpty]);

  return (
    <div className="h-[100dvh] overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_38%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-6">
      <div className="mx-auto flex min-h-full w-full max-w-[420px] flex-col justify-center">
        <div className="rounded-[32px] bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/80">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {messages.ledgerSelect.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {loading ? messages.ledgerSelect.loading : messages.ledgerSelect.subtitle}
            </p>
          </div>

          {errorMessage ? (
            <p className="mb-4 rounded-[18px] bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
              {errorMessage}
            </p>
          ) : null}

          <div className="grid gap-4">
            <button
              type="button"
              disabled={loading || busyAction !== "none"}
              onClick={onCreateLedger}
              className="rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition active:scale-[0.99] disabled:opacity-60"
            >
              <p className="text-base font-bold text-slate-900">
                {busyAction === "create"
                  ? messages.ledgerSelect.creating
                  : messages.ledgerSelect.createTitle}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {messages.ledgerSelect.createDesc}
              </p>
            </button>

            <button
              type="button"
              disabled={loading || busyAction !== "none" || !invite}
              onClick={onAcceptInvite}
              className="rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition active:scale-[0.99] disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none"
            >
              <p className="text-base font-bold text-slate-900">
                {busyAction === "accept"
                  ? messages.ledgerSelect.accepting
                  : messages.ledgerSelect.inviteTitle}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {inviteButtonLabel}
              </p>
              <p className="mt-3 text-xs font-medium text-slate-400">
                {messages.ledgerSelect.inviteDesc}
              </p>
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-xs tracking-wide text-slate-400">flyingCompany</p>
      </div>
    </div>
  );
}
