// @ts-nocheck

import { Button } from "@ui/components/button";
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
import { deleteSession, getDevices } from "../api/methods";
import type {
  ClientRepresentation,
  DeviceRepresentation,
  SessionRepresentation,
} from "../api/representations";
import { Page } from "../components/page/Page";
import { SessionsSkeleton } from "../root/Skeleton";
import { useAccountAlerts } from "../utils/useAccountAlerts";

const GROUP =
  "w-full overflow-hidden rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] text-left dark:border-[#38383a] dark:bg-[#1c1c1e]";
const SEPARATOR = "ms-4 h-px bg-[#e5e5ea] dark:bg-[#38383a]";
const DANGER_TEXT = "text-[#d70015] dark:text-[#ff453a]";

type State =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      rows: { device: DeviceRepresentation; session: SessionRepresentation }[];
    };

function ConfirmButton({
  trigger,
  title,
  confirmLabel,
  cancelLabel,
  onConfirm,
  children,
}: {
  trigger: ReactNode;
  title: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  children: ReactNode;
}) {
  return (
    <Confirm>
      <ConfirmTrigger asChild>{trigger}</ConfirmTrigger>
      <ConfirmContent>
        <ConfirmHeader>
          <ConfirmTitle>{title}</ConfirmTitle>
          <ConfirmDescription>{children}</ConfirmDescription>
        </ConfirmHeader>
        <ConfirmFooter>
          <ConfirmCancel>{cancelLabel}</ConfirmCancel>
          <ConfirmAction onClick={() => onConfirm()}>
            {confirmLabel}
          </ConfirmAction>
        </ConfirmFooter>
      </ConfirmContent>
    </Confirm>
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

function sortRows(devices: DeviceRepresentation[]) {
  const rows = devices.flatMap((device) =>
    device.sessions.map((session) => ({ device, session })),
  );
  return rows.sort(
    (a, b) => Number(!!b.session.current) - Number(!!a.session.current),
  );
}

export const DeviceActivity = () => {
  const { t } = useTranslation();
  const context = useEnvironment<AccountEnvironment>();
  const { addAlert, addError } = useAccountAlerts();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const locale = context.environment.locale;

  useEffect(() => {
    const controller = new AbortController();
    setState((previous) =>
      previous.status === "ready" ? previous : { status: "loading" },
    );
    getDevices({ signal: controller.signal, context })
      .then((devices) =>
        setState({ status: "ready", rows: sortRows(devices ?? []) }),
      )
      .catch((error) => {
        if (error?.name !== "AbortError") setState({ status: "error" });
      });
    return () => controller.abort();
  }, [attempt]);

  const signOutAll = async () => {
    await deleteSession(context);
    await context.keycloak.logout();
  };

  const signOutSession = async (
    session: SessionRepresentation,
    device: DeviceRepresentation,
  ) => {
    try {
      await deleteSession(context, session.id);
      addAlert(
        t("signedOutSession", { browser: session.browser, os: device.os }),
      );
      setAttempt((n) => n + 1);
    } catch (error) {
      addError("errorSignOutMessage", error);
    }
  };

  const deviceName = (
    device: DeviceRepresentation,
    session: SessionRepresentation,
  ) => {
    const os = device.os?.toLowerCase().includes("unknown")
      ? t("unknownOperatingSystem")
      : device.os;
    const version =
      device.osVersion && !device.osVersion.toLowerCase().includes("unknown")
        ? ` ${device.osVersion}`
        : "";
    return `${os}${version} / ${session.browser}`;
  };

  const lastAccess = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const day = date.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const time = date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <>
        {t("lastAccessedOn")}{" "}
        <span className="whitespace-nowrap">{`${day}, ${time}`}</span>
      </>
    );
  };

  const clientNames = (clients: ClientRepresentation[]) =>
    clients
      .map((client) =>
        client.clientName ? label(t, client.clientName) : client.clientId,
      )
      .join(", ");

  return (
    <Page title={t("sessions")} description={t("sessionsDescription")}>
      <h2 className="mb-2 ms-0.5 text-center text-sm font-medium text-muted-foreground">
        {t("signedInDevices")}
      </h2>

      {state.status === "loading" && <SessionsSkeleton />}

      {state.status === "error" && (
        <Notice
          title={t("sessionsLoadError")}
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

      {state.status === "ready" && state.rows.length === 0 && (
        <Notice
          title={t("sessionsEmpty")}
          description={t("sessionsEmptyDescription")}
        />
      )}

      {state.status === "ready" && state.rows.length > 0 && (
        <ul className={GROUP}>
          {state.rows.map(({ device, session }, index) => {
            const clients = clientNames(session.clients ?? []);
            return (
              <li key={session.id} data-testid={`row-${index}`}>
                {index > 0 && <div className={SEPARATOR} />}
                <div className="flex items-start justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0 text-[13px] leading-[1.45] text-muted-foreground">
                    <div
                      id={`session-${session.id}`}
                      className="text-base leading-normal font-medium text-foreground"
                    >
                      {deviceName(device, session)}
                    </div>
                    {session.ipAddress && (
                      <div className="mt-0.5 tabular-nums">
                        {session.ipAddress}
                      </div>
                    )}
                    <div className="mt-0.5 tabular-nums">
                      {lastAccess(session.lastAccess)}
                    </div>
                    {clients && <div className="mt-0.5">{clients}</div>}
                  </div>
                  {session.current ? (
                    <span className="flex h-6.5 shrink-0 items-center rounded-full border border-[#d2d2d7] px-2.5 text-[13px] font-medium dark:border-[#48484a]">
                      {t("currentSession")}
                    </span>
                  ) : (
                    <ConfirmButton
                      trigger={
                        <button
                          type="button"
                          aria-describedby={`session-${session.id}`}
                          className={`shrink-0 rounded-md text-[15px] font-medium outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/50 ${DANGER_TEXT}`}
                        >
                          {t("sessionClose")}
                        </button>
                      }
                      title={t("signOut")}
                      confirmLabel={t("sessionClose")}
                      cancelLabel={t("cancel")}
                      onConfirm={() => signOutSession(session, device)}
                    >
                      {t("signOutWarning")}
                    </ConfirmButton>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-7">
        <ConfirmButton
          trigger={
            <Button
              size="form"
              block
              className="bg-[#d70015] text-white hover:bg-[#d70015]/90 dark:bg-[#ff453a] dark:hover:bg-[#ff453a]/90"
            >
              {t("signOutAllDevices")}
            </Button>
          }
          title={t("signOutAllDevices")}
          confirmLabel={t("sessionClose")}
          cancelLabel={t("cancel")}
          onConfirm={() => signOutAll()}
        >
          {t("signOutAllDevicesWarning")}
        </ConfirmButton>
      </div>
    </Page>
  );
};

export default DeviceActivity;
