// @ts-nocheck

import { Button } from "@ui/components/button";
import { cn } from "@ui/lib/utils";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import type { AccountEnvironment } from "..";
import { getCredentials } from "../api/methods";
import type {
  CredentialContainer,
  CredentialMetadataRepresentation,
} from "../api/representations";
import { Page } from "../components/page/Page";
import { MethodsSkeleton } from "../root/Skeleton";
import type { TFuncKey } from "../i18n-type";

const ORDER = [
  "password",
  "otp",
  "recovery-authn-codes",
  "webauthn",
  "webauthn-passwordless",
];

const GROUP =
  "w-full overflow-hidden rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] text-left dark:border-[#38383a] dark:bg-[#1c1c1e]";
const SEPARATOR = "ms-4 h-px bg-[#e5e5ea] dark:bg-[#38383a]";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; containers: CredentialContainer[] };

type Row = {
  key: string;
  title: string;
  detail?: string;
  actions: { label: string; onClick: () => void; destructive?: boolean }[];
};

function rank(type: string) {
  const index = ORDER.indexOf(type);
  return index === -1 ? ORDER.length : index;
}

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
    <div className={GROUP}>
      <div className="px-4 py-6 text-center">
        <div className="text-base font-semibold">{title}</div>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        {children}
      </div>
    </div>
  );
}

export const SigningIn = () => {
  const { t } = useTranslation();
  const context = useEnvironment<AccountEnvironment>();
  const { login } = context.keycloak;
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    getCredentials({ signal: controller.signal, context })
      .then((containers) =>
        setState({ status: "ready", containers: containers ?? [] }),
      )
      .catch((error) => {
        if (error?.name !== "AbortError") setState({ status: "error" });
      });
    return () => controller.abort();
  }, [attempt]);

  const translate = (message?: { key: string; parameters?: string[] }) =>
    message
      ? t(
          message.key as TFuncKey,
          (message.parameters ?? []).reduce(
            (acc, value, index) => ({ ...acc, [index]: value }),
            {},
          ),
        )
      : undefined;

  const created = (date?: number) =>
    date
      ? t("credentialCreated", {
          date: new Date(date).toLocaleDateString(context.environment.locale),
        })
      : undefined;

  const credentialDetail = (
    container: CredentialContainer,
    meta: CredentialMetadataRepresentation,
  ) => {
    const { credential } = meta;
    const label =
      credential.userLabel && container.type !== "recovery-authn-codes"
        ? t(credential.userLabel as TFuncKey)
        : undefined;
    return [label, translate(meta.infoMessage), created(credential.createdDate)]
      .filter(Boolean)
      .join(" · ");
  };

  const rowsOf = (container: CredentialContainer): Row[] => {
    const title = t(container.displayName as TFuncKey);
    const metas = container.userCredentialMetadatas ?? [];

    if (metas.length === 0) {
      return [
        {
          key: container.type,
          title,
          detail: t(container.helptext as TFuncKey),
          actions: container.createAction
            ? [
                {
                  label: t("credentialSetUp"),
                  onClick: () => login({ action: container.createAction }),
                },
              ]
            : [],
        },
      ];
    }

    return metas.map((meta) => ({
      key: meta.credential.id,
      title,
      detail: credentialDetail(container, meta),
      actions: [
        ...(container.updateAction
          ? [
              {
                label: t("update"),
                onClick: () => login({ action: container.updateAction }),
              },
            ]
          : []),
        ...(container.removeable
          ? [
              {
                label: t("credentialRemove"),
                destructive: true,
                onClick: () =>
                  login({ action: `delete_credential:${meta.credential.id}` }),
              },
            ]
          : []),
      ],
    }));
  };

  const rows =
    state.status === "ready"
      ? [...state.containers]
          .sort((a, b) => rank(a.type) - rank(b.type))
          .flatMap(rowsOf)
      : [];

  return (
    <Page title={t("accountSecurity")} description={t("signingInDescription")}>
      {state.status === "loading" && <MethodsSkeleton />}

      {state.status === "error" && (
        <Notice
          title={t("signingInLoadError")}
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

      {state.status === "ready" && rows.length === 0 && (
        <Notice
          title={t("signingInEmpty")}
          description={t("signingInEmptyDescription")}
        />
      )}

      {state.status === "ready" && rows.length > 0 && (
        <>
          <h2 className="mb-2 ms-0.5 text-center text-sm font-medium text-muted-foreground">
            {t("signingInMethods")}
          </h2>
          <ul className={GROUP}>
            {rows.map((row, index) => (
              <li key={row.key} data-testid={`credential-${row.key}`}>
                {index > 0 && <div className={SEPARATOR} />}
                <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div id={`method-${row.key}`} className="text-base">
                      {row.title}
                    </div>
                    {row.detail && (
                      <div className="mt-0.5 text-[13px] text-muted-foreground tabular-nums">
                        {row.detail}
                      </div>
                    )}
                  </div>
                  {row.actions.length > 0 && (
                    <div className="flex shrink-0 items-center gap-4">
                      {row.actions.map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          aria-describedby={`method-${row.key}`}
                          onClick={action.onClick}
                          className={cn(
                            "rounded-md text-[15px] font-medium outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/50",
                            action.destructive
                              ? "text-[#d70015] dark:text-[#ff453a]"
                              : "text-primary",
                          )}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Page>
  );
};

export default SigningIn;
