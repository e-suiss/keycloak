// @ts-nocheck

import { useEffect, useState } from "react";
import { useAdminClient } from "../../admin-client";
import { useT } from "../../ui/i18n";
import { Chip, Group, ListSkeleton, Notice, Pager, Row, Section, SegmentTabs } from "../../ui/kit";
import { useRealm } from "../../ui/realm";
import { formatDate } from "./shared";

const PAGE = 10;

export function EventsTab({ user }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const [kind, setKind] = useState<"user" | "admin">("user");
    const [first, setFirst] = useState(0);
    const [attempt, setAttempt] = useState(0);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [rows, setRows] = useState<any[]>([]);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        const request =
            kind === "user"
                ? adminClient.realms.findEvents({ realm, user: user.id, first, max: PAGE })
                : adminClient.realms.findAdminEvents({ realm, resourcePath: `users/${user.id}*`, first, max: PAGE });
        request
            .then((data: any) => {
                if (!alive) return;
                setRows(Array.isArray(data) ? data : []);
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, realm, user.id, kind, first, attempt]);

    return (
        <>
            <SegmentTabs
                ariaLabel={t("sxUserDetailXTabEvents")}
                value={kind}
                onChange={v => {
                    setFirst(0);
                    setKind(v);
                }}
                items={[
                    { value: "user", label: t("sxUserDetailXUserEvents") },
                    { value: "admin", label: t("sxEventsAdminTab") }
                ]}
            />
            <Section label={kind === "user" ? t("sxUserDetailXUserEvents") : t("sxEventsAdminTab")}>
                {status === "loading" && <ListSkeleton rows={4} />}
                {status === "error" && (
                    <Notice
                        title={t("sxEventsLoadError")}
                        description={t("sxEventsLoadErrorDescription")}
                        onRetry={() => setAttempt(n => n + 1)}
                    />
                )}
                {status === "ready" && rows.length === 0 && (
                    <Notice
                        title={t("sxEventsEmptyTitle")}
                        description={kind === "user" ? t("sxUserDetailXNoUserEventsDescription") : t("sxUserDetailXNoAdminEventsDescription")}
                    />
                )}
                {status === "ready" && rows.length > 0 && (
                    <Group>
                        {rows.map((e, i) =>
                            kind === "user" ? (
                                <Row
                                    key={`${e.time}-${i}`}
                                    title={e.type || "—"}
                                    subtitle={[e.clientId, e.ipAddress, formatDate(e.time)].filter(Boolean).join(" · ")}
                                    trailing={e.error ? <Chip tone="danger">{e.error}</Chip> : undefined}
                                />
                            ) : (
                                <Row
                                    key={`${e.time}-${i}`}
                                    title={[e.operationType, e.resourceType].filter(Boolean).join(" · ") || "—"}
                                    subtitle={[e.resourcePath, e.authDetails?.ipAddress, formatDate(e.time)].filter(Boolean).join(" · ")}
                                    trailing={e.error ? <Chip tone="danger">{e.error}</Chip> : undefined}
                                />
                            )
                        )}
                    </Group>
                )}
                {status === "ready" && (
                    <div className="mt-3">
                        <Pager
                            page={Math.floor(first / PAGE) + 1}
                            hasPrev={first > 0}
                            hasNext={rows.length >= PAGE}
                            onPrev={() => setFirst(f => Math.max(0, f - PAGE))}
                            onNext={() => setFirst(f => f + PAGE)}
                        />
                    </div>
                )}
            </Section>
        </>
    );
}
