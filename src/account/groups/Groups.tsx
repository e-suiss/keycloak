// @ts-nocheck

import { Button } from "@ui/components/button";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import { getGroups } from "../api/methods";
import type { Group } from "../api/representations";
import { Page } from "../components/page/Page";
import { ListSkeleton } from "../root/Skeleton";

const GROUP =
  "w-full overflow-hidden rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] text-left dark:border-[#38383a] dark:bg-[#1c1c1e]";
const SEPARATOR = "ms-4 h-px bg-[#e5e5ea] dark:bg-[#38383a]";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; groups: Group[] };

function withParents(groups: Group[]) {
  const all = [...groups];
  const paths = new Set(groups.map((group) => group.path));
  for (const group of groups) {
    let path = group.path.slice(0, group.path.lastIndexOf("/"));
    while (path && !paths.has(path)) {
      paths.add(path);
      all.push({ name: path.slice(path.lastIndexOf("/") + 1), path });
      path = path.slice(0, path.lastIndexOf("/"));
    }
  }
  return all.sort((a, b) => a.path.localeCompare(b.path));
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

function GroupIcon() {
  return (
    <span className="grid size-10 shrink-0 place-items-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5.5 stroke-[#1d1d1f] dark:stroke-[#f5f5f7]"
      >
        <circle cx="5.5" cy="5.5" r="2.2" />
        <path d="M1.5 13c0-2.2 1.8-3.6 4-3.6s4 1.4 4 3.6" />
        <path d="M10.2 3.6a2.2 2.2 0 0 1 0 4.2" />
        <path d="M11.6 9.6c1.7.4 2.9 1.7 2.9 3.4" />
      </svg>
    </span>
  );
}

export const Groups = () => {
  const { t } = useTranslation();
  const context = useEnvironment();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    getGroups({ signal: controller.signal, context })
      .then((groups) =>
        setState({ status: "ready", groups: withParents(groups ?? []) }),
      )
      .catch((error) => {
        if (error?.name !== "AbortError") setState({ status: "error" });
      });
    return () => controller.abort();
  }, [attempt]);

  return (
    <Page title={t("groups")} description={t("groupDescriptionLabel")}>
      <h2 className="mb-2 ms-0.5 text-center text-sm font-medium text-muted-foreground">
        {t("groups")}
      </h2>

      {state.status === "loading" && <ListSkeleton />}

      {state.status === "error" && (
        <Notice
          title={t("groupsLoadError")}
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

      {state.status === "ready" && state.groups.length === 0 && (
        <Notice
          title={t("noGroups")}
          description={t("groupDescriptionLabel")}
        />
      )}

      {state.status === "ready" && state.groups.length > 0 && (
        <ul id="groups-list" className={GROUP}>
          {state.groups.map((group, index) => (
            <li key={group.path} id={`${index}-group`}>
              {index > 0 && <div className={SEPARATOR} />}
              <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <GroupIcon />
                  <div className="min-w-0">
                    <div
                      data-testid={`group[${index}].name`}
                      className="text-base font-medium"
                    >
                      {group.name}
                    </div>
                    <div
                      id={`${index}-group-path`}
                      className="mt-0.5 text-[13px] text-muted-foreground [overflow-wrap:anywhere]"
                    >
                      {group.path}
                    </div>
                  </div>
                </div>
                {group.id != null && (
                  <span
                    id={`${index}-group-directMembership`}
                    className="flex h-6.5 shrink-0 items-center rounded-full border border-[#248a3d] px-2.5 text-[13px] font-medium whitespace-nowrap text-[#248a3d] dark:border-[#32d74b] dark:text-[#32d74b]"
                  >
                    {t("directMembership")}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
};

export default Groups;
