// @ts-nocheck

import type OrganizationRepresentation from "@keycloak/keycloak-admin-client/lib/defs/organizationRepresentation";
import { Button } from "@ui/components/button";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import type { AccountEnvironment } from "..";
import { getUserOrganizations } from "../api/methods";
import { Page } from "../components/page/Page";
import { ListSkeleton } from "../root/Skeleton";

const GROUP =
  "w-full overflow-hidden rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] text-left dark:border-[#38383a] dark:bg-[#1c1c1e]";
const SEPARATOR = "ms-4 h-px bg-[#e5e5ea] dark:bg-[#38383a]";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; organizations: OrganizationRepresentation[] };

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

export const Organizations = () => {
  const { t } = useTranslation();
  const context = useEnvironment<AccountEnvironment>();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    getUserOrganizations({ signal: controller.signal, context })
      .then((organizations) =>
        setState({ status: "ready", organizations: organizations ?? [] }),
      )
      .catch((error) => {
        if (error?.name !== "AbortError") setState({ status: "error" });
      });
    return () => controller.abort();
  }, [attempt]);

  return (
    <Page title={t("organizations")} description={t("organizationDescription")}>
      <h2 className="mb-2 ms-0.5 text-center text-sm font-medium text-muted-foreground">
        {t("organizations")}
      </h2>

      {state.status === "loading" && <ListSkeleton />}

      {state.status === "error" && (
        <Notice
          title={t("organizationsLoadError")}
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

      {state.status === "ready" && state.organizations.length === 0 && (
        <Notice
          title={t("emptyUserOrganizations")}
          description={t("organizationDescription")}
        />
      )}

      {state.status === "ready" && state.organizations.length > 0 && (
        <ul className={GROUP}>
          {state.organizations.map((organization, index) => {
            const subtitle =
              organization.description ||
              organization.domains?.map((domain) => domain.name).join(", ");
            return (
              <li key={organization.id}>
                {index > 0 && <div className={SEPARATOR} />}
                <div className="min-w-0 px-4 py-3.5">
                  <div className="text-base font-medium">
                    {organization.name}
                  </div>
                  {subtitle && (
                    <div className="mt-0.5 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                      {subtitle}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
};

export default Organizations;
