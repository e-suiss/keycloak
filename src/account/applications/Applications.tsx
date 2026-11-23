// @ts-nocheck

import { Button } from "@ui/components/button";
import { cn } from "@ui/lib/utils";
import {
  Confirm,
  ConfirmAction,
  ConfirmCancel,
  ConfirmContent,
  ConfirmDescription,
  ConfirmFooter,
  ConfirmHeader,
  ConfirmTitle,
  ConfirmTrigger,
} from "@ui/patterns/confirm";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { label, useEnvironment } from "../../shared/keycloak-ui-shared";
import type { AccountEnvironment } from "..";
import { deleteConsent, getApplications } from "../api/methods";
import type { ClientRepresentation } from "../api/representations";
import { Page } from "../components/page/Page";
import { ListSkeleton } from "../root/Skeleton";
import type { TFuncKey } from "../i18n-type";
import { useAccountAlerts } from "../utils/useAccountAlerts";

const CARD =
  "w-full overflow-hidden rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] text-left dark:border-[#38383a] dark:bg-[#1c1c1e]";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; applications: ClientRepresentation[] };

function Notice({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className={CARD}>
      <div className="px-4 py-6 text-center">
        <div className="text-base font-semibold">{title}</div>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        {children}
      </div>
    </div>
  );
}

function AppIcon({ logoUri }: { logoUri?: string }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center">
      {logoUri ? (
        <img
          src={logoUri}
          alt=""
          className="size-7 rounded-md object-contain"
        />
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5.5 stroke-[#1d1d1f] dark:stroke-[#f5f5f7]"
        >
          <rect x="2" y="2" width="5" height="5" rx="1" />
          <rect x="9" y="2" width="5" height="5" rx="1" />
          <rect x="2" y="9" width="5" height="5" rx="1" />
          <rect x="9" y="9" width="5" height="5" rx="1" />
        </svg>
      )}
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 stroke-[#6e6e73] dark:stroke-[#8e8e93]"
    >
      <path d={open ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
    </svg>
  );
}

function Detail({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-muted-foreground">{title}</dt>
      <dd className="mt-0.5 text-[15px] [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}

export const Applications = () => {
  const { t } = useTranslation();
  const context = useEnvironment<AccountEnvironment>();
  const { addAlert, addError } = useAccountAlerts();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    setState((previous) =>
      previous.status === "ready" ? previous : { status: "loading" },
    );
    getApplications({ signal: controller.signal, context })
      .then((applications) =>
        setState({ status: "ready", applications: applications ?? [] }),
      )
      .catch((error) => {
        if (error?.name !== "AbortError") setState({ status: "error" });
      });
    return () => controller.abort();
  }, [attempt]);

  const toggle = (clientId: string) =>
    setOpen((previous) => {
      const next = new Set(previous);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });

  const removeConsent = async (clientId: string) => {
    try {
      await deleteConsent(context, clientId);
      addAlert(t("removeConsentSuccess"));
      setAttempt((n) => n + 1);
    } catch (error) {
      addError("removeConsentError", error);
    }
  };

  const date = (value: number) =>
    new Date(value).toLocaleDateString(context.environment.locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const renderApplication = (application: ClientRepresentation) => {
    const name = label(t, application.clientName || application.clientId);
    const isOpen = open.has(application.clientId);
    const kind = application.userConsentRequired
      ? t("thirdPartyApp")
      : t("internalApp");
    const subtitle = application.offlineAccess
      ? `${kind}, ${t("offlineAccess")}`
      : kind;
    const contentId = `content-${application.clientId}`;

    return (
      <li
        key={application.clientId}
        className={CARD}
        data-testid="applications-list-item"
      >
        <div
          className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5"
          onClick={(event) => {
            if (!(event.target as HTMLElement).closest("a,button"))
              toggle(application.clientId);
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <AppIcon logoUri={application.logoUri} />
            <div className="min-w-0">
              <div className="truncate text-base font-medium">
                {application.effectiveUrl ? (
                  <a
                    href={application.effectiveUrl}
                    target="_blank"
                    rel="noopener"
                    className="rounded-sm text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {name}
                  </a>
                ) : (
                  name
                )}
              </div>
              <div className="mt-0.5 text-[13px] text-muted-foreground">
                {subtitle}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3.5">
            <span
              className={cn(
                "flex h-6.5 items-center rounded-full border px-2.5 text-[13px] font-medium",
                application.inUse
                  ? "border-[#248a3d] text-[#248a3d] dark:border-[#32d74b] dark:text-[#32d74b]"
                  : "border-[#d2d2d7] text-muted-foreground dark:border-[#48484a]",
              )}
            >
              {application.inUse ? t("inUse") : t("notInUse")}
            </span>
            <button
              type="button"
              id={`toggle-${application.clientId}`}
              aria-controls={contentId}
              aria-expanded={isOpen}
              aria-label={t("applicationDetails", {
                clientId: application.clientId,
              })}
              onClick={() => toggle(application.clientId)}
              className="grid size-6 place-items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Chevron open={isOpen} />
            </button>
          </div>
        </div>

        {isOpen && (
          <div id={contentId}>
            <div className="ms-4 h-px bg-[#e5e5ea] dark:bg-[#38383a]" />
            <dl className="flex flex-col gap-3 px-4 pt-3.5 pb-4">
              <Detail title={t("client")}>{application.clientId}</Detail>
              {application.description && (
                <Detail title={t("description")}>
                  {application.description}
                </Detail>
              )}
              {application.effectiveUrl && (
                <Detail title="URL">{application.effectiveUrl}</Detail>
              )}
              {application.consent && (
                <>
                  {application.tosUri && (
                    <Detail title={t("termsOfService")}>
                      {application.tosUri}
                    </Detail>
                  )}
                  {application.policyUri && (
                    <Detail title={t("privacyPolicy")}>
                      {application.policyUri}
                    </Detail>
                  )}
                  <Detail title={t("accessGrantedOn")}>
                    <span className="tabular-nums">
                      {date(application.consent.createdDate)}
                    </span>
                  </Detail>
                  {application.consent.grantedScopes.length > 0 && (
                    <Detail title={t("hasAccessTo")}>
                      {application.consent.grantedScopes
                        .map((scope) =>
                          t(scope.name as TFuncKey, scope.displayText),
                        )
                        .join(", ")}
                    </Detail>
                  )}
                </>
              )}
              {(application.consent || application.offlineAccess) && (
                <Confirm>
                  <ConfirmTrigger asChild>
                    <button
                      type="button"
                      className="self-start rounded-md text-sm font-medium text-[#d70015] outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/50 dark:text-[#ff453a]"
                    >
                      {t("removeAccess")}
                    </button>
                  </ConfirmTrigger>
                  <ConfirmContent>
                    <ConfirmHeader>
                      <ConfirmTitle>{t("removeAccess")}</ConfirmTitle>
                      <ConfirmDescription>
                        {t("removeModalMessage", { name })}
                      </ConfirmDescription>
                    </ConfirmHeader>
                    <ConfirmFooter>
                      <ConfirmCancel>{t("cancel")}</ConfirmCancel>
                      <ConfirmAction
                        onClick={() => removeConsent(application.clientId)}
                      >
                        {t("removeAccess")}
                      </ConfirmAction>
                    </ConfirmFooter>
                  </ConfirmContent>
                </Confirm>
              )}
            </dl>
          </div>
        )}
      </li>
    );
  };

  return (
    <Page title={t("applications")} description={t("applicationsIntroMessage")}>
      <h2 className="mb-2 ms-0.5 text-center text-sm font-medium text-muted-foreground">
        {t("applicationsGranted")}
      </h2>

      {state.status === "loading" && <ListSkeleton />}

      {state.status === "error" && (
        <Notice
          title={t("applicationsLoadError")}
          description={t("signingInLoadErrorDescription")}
        >
          <Button
            size="sm"
            className="mt-3.5 h-8.5 px-4 font-medium"
            onClick={() => setAttempt((n) => n + 1)}
          >
            {t("tryAgain")}
          </Button>
        </Notice>
      )}

      {state.status === "ready" && state.applications.length === 0 && (
        <Notice
          title={t("applicationsEmpty")}
          description={t("applicationsEmptyDescription")}
        />
      )}

      {state.status === "ready" && state.applications.length > 0 && (
        <ul className="flex flex-col gap-3">
          {state.applications.map(renderApplication)}
        </ul>
      )}
    </Page>
  );
};

export default Applications;
