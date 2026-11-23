// @ts-nocheck

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
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
} from "@ui/patterns/confirm";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import { fetchPermission, fetchResources, updatePermissions } from "../api";
import { getPermissionRequests } from "../api/methods";
import type { Permission, Resource } from "../api/representations";
import { ListSkeleton } from "../root/Skeleton";
import { useAccountAlerts } from "../utils/useAccountAlerts";
import { EditTheResource } from "./EditTheResource";
import { PermissionRequest } from "./PermissionRequest";
import { SharedWith } from "./SharedWith";
import { ShareTheResource } from "./ShareTheResource";

const GROUP =
  "w-full overflow-hidden rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] text-left dark:border-[#38383a] dark:bg-[#1c1c1e]";
const SEPARATOR = "ms-4 h-px bg-[#e5e5ea] dark:bg-[#38383a]";
const CHIP =
  "flex h-6.5 items-center rounded-full border border-[#d2d2d7] px-2.5 text-[13px] font-medium whitespace-nowrap dark:border-[#48484a]";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; resources: Resource[] };

type Dialog =
  { kind: "share" | "edit" | "unshare"; resource: Resource } | undefined;

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

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 stroke-foreground"
    >
      <path d={open ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
    </svg>
  );
}

function ResourceName({ resource }: { resource: Resource }) {
  const className = "text-base font-medium text-primary";
  return resource.client?.baseUrl ? (
    <a
      href={resource.client.baseUrl}
      target="_blank"
      rel="noopener"
      className={`${className} rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50`}
    >
      {resource.name}
    </a>
  ) : (
    <span className={className}>{resource.name}</span>
  );
}

type ResourcesTabProps = {
  isShared?: boolean;
};

export const ResourcesTab = ({ isShared = false }: ResourcesTabProps) => {
  const { t } = useTranslation();
  const context = useEnvironment();
  const { addAlert, addError } = useAccountAlerts();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [open, setOpen] = useState<string>();
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>(
    {},
  );
  const [dialog, setDialog] = useState<Dialog>();

  useEffect(() => {
    const timer = setTimeout(() => setName(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    setState((previous) =>
      previous.status === "ready" ? previous : { status: "loading" },
    );
    const params: Record<string, string> = {
      first: "0",
      max: "100",
      ...(name ? { name } : {}),
    };
    fetchResources({ signal, context }, params, isShared)
      .then(async ({ data }) => {
        if (!isShared) {
          await Promise.all(
            data.map(async (resource) => {
              resource.shareRequests = await getPermissionRequests(
                resource._id,
                { signal, context },
              );
            }),
          );
        }
        setState({ status: "ready", resources: data });
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setState({ status: "error" });
      });
    return () => controller.abort();
  }, [attempt, name, isShared]);

  const loadPermissions = async (id: string) => {
    const loaded = await fetchPermission({ context }, id);
    setPermissions((previous) => ({ ...previous, [id]: loaded }));
    return loaded;
  };

  const toggle = async (resource: Resource) => {
    if (open === resource._id) {
      setOpen(undefined);
      return;
    }
    setOpen(resource._id);
    await loadPermissions(resource._id);
  };

  const openDialog = async (
    kind: "share" | "edit" | "unshare",
    resource: Resource,
  ) => {
    if (!permissions[resource._id]) await loadPermissions(resource._id);
    setDialog({ kind, resource });
  };

  const closeDialog = async () => {
    const resource = dialog?.resource;
    setDialog(undefined);
    if (resource) await loadPermissions(resource._id);
  };

  const removeShares = async (resource: Resource) => {
    try {
      const current =
        permissions[resource._id] ?? (await loadPermissions(resource._id));
      await updatePermissions(
        context,
        resource._id,
        current.map(({ username }) => ({ username, scopes: [] }) as Permission),
      );
      await loadPermissions(resource._id);
      addAlert(t("unShareSuccess"));
    } catch (error) {
      addError("unShareError", error);
    }
  };

  const sectionTitle = isShared ? t("sharedWithMe") : t("myResources");

  const renderMine = (resource: Resource, index: number) => {
    const isOpen = open === resource._id;
    const shared = permissions[resource._id];
    const noShares = !shared || shared.length === 0;
    const panelId = `resource-panel-${resource._id}`;
    return (
      <li key={resource._id}>
        {index > 0 && <div className={SEPARATOR} />}
        <div className="flex items-start justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0" data-testid={`row[${index}].name`}>
            <ResourceName resource={resource} />
            {isOpen && shared && (
              <div className="mt-0.5 text-[13px] [&_div]:text-[13px]">
                <SharedWith permissions={shared} />
              </div>
            )}
          </div>
          <div className="flex h-6 shrink-0 items-center gap-3">
            {resource.shareRequests?.length > 0 && (
              <PermissionRequest
                resource={resource}
                refresh={() => setAttempt((n) => n + 1)}
              />
            )}
            <button
              type="button"
              data-testid={`share-${resource.name}`}
              onClick={() => openDialog("share", resource)}
              className="rounded-md text-[15px] font-medium text-primary outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {t("share")}
            </button>
            <button
              type="button"
              data-testid={`expand-${resource.name}`}
              aria-label={resource.name}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(resource)}
              className="grid size-6 place-items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Chevron open={isOpen} />
            </button>
          </div>
        </div>
        {isOpen && (
          <div
            id={panelId}
            className="mx-4 mb-3.5 rounded-xl border border-[#e5e5ea] bg-background p-1.5 dark:border-[#38383a] dark:bg-[#2c2c2e]"
          >
            <button
              type="button"
              disabled={noShares}
              onClick={() => openDialog("edit", resource)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] outline-none hover:bg-black/4 focus-visible:bg-black/6 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-white/6"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 stroke-muted-foreground"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
              {t("edit")}
            </button>
            <button
              type="button"
              disabled={noShares}
              onClick={() => setDialog({ kind: "unshare", resource })}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] text-[#d70015] outline-none hover:bg-black/4 focus-visible:bg-black/6 disabled:pointer-events-none disabled:opacity-50 dark:text-[#ff453a] dark:hover:bg-white/6"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 stroke-current"
              >
                <path d="M4 7h16" />
                <path d="M9 7V4h6v3" />
                <path d="M6 7l1 13h10l1-13" />
              </svg>
              {t("unShare")}
            </button>
          </div>
        )}
      </li>
    );
  };

  const renderShared = (resource: Resource, index: number) => (
    <li key={resource._id}>
      {index > 0 && <div className={SEPARATOR} />}
      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="min-w-0" data-testid={`row[${index}].name`}>
          <ResourceName resource={resource} />
          <div className="mt-0.5 text-[13px] text-muted-foreground">
            {resource.client?.name || resource.client?.clientId}
          </div>
        </div>
        {resource.scopes?.length > 0 && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {resource.scopes.map((scope) => (
              <span key={scope.name} className={CHIP}>
                {scope.displayName || scope.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <MagnifyingGlassIcon className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          size="lg"
          type="search"
          aria-label={t("filterByName")}
          placeholder={t("filterByName")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="data-[size=lg]:ps-10.5"
        />
      </div>

      <section>
        <h2 className="mb-2 ms-0.5 text-center text-sm font-medium text-muted-foreground">
          {sectionTitle}
        </h2>

        {state.status === "loading" && <ListSkeleton />}

        {state.status === "error" && (
          <Notice
            title={
              isShared ? t("sharedResourcesLoadError") : t("resourcesLoadError")
            }
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

        {state.status === "ready" && state.resources.length === 0 && (
          <Notice
            title={isShared ? t("sharedResourcesEmpty") : t("resourcesEmpty")}
            description={
              isShared
                ? t("sharedResourcesEmptyDescription")
                : t("resourceIntroMessage")
            }
          />
        )}

        {state.status === "ready" && state.resources.length > 0 && (
          <ul className={cn(GROUP)}>
            {state.resources.map(isShared ? renderShared : renderMine)}
          </ul>
        )}
      </section>

      {dialog?.kind === "share" && (
        <ShareTheResource
          resource={dialog.resource}
          permissions={permissions[dialog.resource._id]}
          open
          onClose={closeDialog}
        />
      )}

      {dialog?.kind === "edit" && (
        <EditTheResource
          resource={dialog.resource}
          permissions={permissions[dialog.resource._id]}
          onClose={closeDialog}
        />
      )}

      <Confirm
        open={dialog?.kind === "unshare"}
        onOpenChange={(next) => !next && setDialog(undefined)}
      >
        <ConfirmContent>
          <ConfirmHeader>
            <ConfirmTitle>{t("unShare")}</ConfirmTitle>
            <ConfirmDescription>{t("unShareAllConfirm")}</ConfirmDescription>
          </ConfirmHeader>
          <ConfirmFooter>
            <ConfirmCancel>{t("cancel")}</ConfirmCancel>
            <ConfirmAction
              onClick={() => {
                const resource = dialog?.resource;
                setDialog(undefined);
                if (resource) removeShares(resource);
              }}
            >
              {t("unShare")}
            </ConfirmAction>
          </ConfirmFooter>
        </ConfirmContent>
      </Confirm>
    </div>
  );
};
