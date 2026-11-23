// @ts-nocheck

import { Button } from "@ui/components/button";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { label, useEnvironment } from "../../shared/keycloak-ui-shared";
import { getLinkedAccounts, unLinkAccount } from "../api/methods";
import type { LinkedAccountRepresentation } from "../api/representations";
import { Page } from "../components/page/Page";
import { ListSkeleton } from "../root/Skeleton";
import { useAccountAlerts } from "../utils/useAccountAlerts";

const GROUP =
  "w-full overflow-hidden rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] text-left dark:border-[#38383a] dark:bg-[#1c1c1e]";
const SEPARATOR = "ms-4 h-px bg-[#e5e5ea] dark:bg-[#38383a]";

type State =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      linked: LinkedAccountRepresentation[];
      unlinked: LinkedAccountRepresentation[];
    };

const MONO = "fill-[#1d1d1f] dark:fill-[#f5f5f7]";

const LOGOS: Record<string, ReactNode> = {
  google: (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-7">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  ),
  github: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`size-6.5 ${MONO}`}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  ),
  apple: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`size-6.5 ${MONO}`}>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  ),
  facebook: (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-6.5 fill-[#1877F2]"
    >
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
    </svg>
  ),
};

function Logo({
  account,
  name,
}: {
  account: LinkedAccountRepresentation;
  name: string;
}) {
  const logo =
    LOGOS[account.providerName?.toLowerCase()] ??
    LOGOS[account.providerAlias?.toLowerCase()];
  return (
    <span className="grid size-10 shrink-0 place-items-center">
      {logo ?? (
        <span className="grid size-7 place-items-center rounded-full bg-[#6e6e73] text-[13px] font-semibold text-white dark:bg-[#48484a]">
          {name.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </span>
  );
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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 ms-0.5 text-center text-sm font-medium text-muted-foreground">
      {children}
    </h2>
  );
}

export const LinkedAccounts = () => {
  const { t } = useTranslation();
  const context = useEnvironment();
  const { addAlert, addError } = useAccountAlerts();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const query = (linked: boolean) =>
      getLinkedAccounts(
        { signal: controller.signal, context },
        { first: 0, max: 100, linked },
      );
    setState((previous) =>
      previous.status === "ready" ? previous : { status: "loading" },
    );
    Promise.all([query(true), query(false)])
      .then(([linked, unlinked]) =>
        setState({
          status: "ready",
          linked: linked ?? [],
          unlinked: unlinked ?? [],
        }),
      )
      .catch((error) => {
        if (error?.name !== "AbortError") setState({ status: "error" });
      });
    return () => controller.abort();
  }, [attempt]);

  const unLink = async (account: LinkedAccountRepresentation) => {
    try {
      await unLinkAccount(context, account);
      addAlert(t("unLinkSuccess"));
      setAttempt((n) => n + 1);
    } catch (error) {
      addError("unLinkError", error);
    }
  };

  const link = (account: LinkedAccountRepresentation) =>
    context.keycloak.login({ action: `idp_link:${account.providerAlias}` });

  const nameOf = (account: LinkedAccountRepresentation) =>
    label(t, account.displayName) ||
    account.providerName ||
    account.providerAlias;

  const hintOf = (account: LinkedAccountRepresentation, name: string) => {
    const specific = `${account.providerName?.toLowerCase()}-link-hint`;
    const text = t(specific);
    return text !== specific ? text : t("linkHint", { name });
  };

  const renderRows = (
    accounts: LinkedAccountRepresentation[],
    linked: boolean,
  ) => (
    <ul
      className={GROUP}
      aria-label={t(linked ? "linkedLoginProviders" : "unlinkedLoginProviders")}
    >
      {accounts.map((account, index) => {
        const name = nameOf(account);
        return (
          <li
            key={account.providerAlias}
            data-testid={`linked-accounts/${account.providerName}`}
          >
            {index > 0 && <div className={SEPARATOR} />}
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <Logo account={account} name={name} />
                <div className="min-w-0">
                  <div
                    id={`${account.providerAlias}-idp-name`}
                    className="text-base font-medium"
                  >
                    {name}
                  </div>
                  <div className="mt-0.5 text-[13px] text-muted-foreground">
                    {linked ? (
                      <>
                        {account.linkedUsername && (
                          <span className="block [overflow-wrap:anywhere]">
                            {account.linkedUsername}
                          </span>
                        )}
                        <span className="mt-0.5 block font-medium whitespace-nowrap text-primary">
                          {t(account.social ? "socialLogin" : "systemDefined")}
                        </span>
                      </>
                    ) : (
                      <span className="[overflow-wrap:anywhere]">
                        {hintOf(account, name)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                id={`${account.providerAlias}-idp-${linked ? "unlink" : "link"}`}
                aria-describedby={`${account.providerAlias}-idp-name`}
                onClick={() => (linked ? unLink(account) : link(account))}
                className={`shrink-0 rounded-md text-sm font-medium outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/50 ${
                  linked ? "text-[#d70015] dark:text-[#ff453a]" : "text-primary"
                }`}
              >
                {t(linked ? "unLink" : "link")}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <Page
      title={t("linkedAccounts")}
      description={t("linkedAccountsIntroMessage")}
    >
      <div className="flex flex-col gap-5">
        <section>
          <SectionLabel>{t("linkedLoginProviders")}</SectionLabel>
          {state.status === "loading" && <ListSkeleton />}
          {state.status === "error" && (
            <Notice
              title={t("linkedLoadError")}
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
          {state.status === "ready" &&
            (state.linked.length > 0 ? (
              renderRows(state.linked, true)
            ) : (
              <Notice
                title={t("linkedEmpty")}
                description={t("linkedEmptyDescription")}
              />
            ))}
        </section>

        {state.status === "ready" && state.unlinked.length > 0 && (
          <section>
            <SectionLabel>{t("unlinkedLoginProviders")}</SectionLabel>
            {renderRows(state.unlinked, false)}
          </section>
        )}
      </div>
    </Page>
  );
};

export default LinkedAccounts;
