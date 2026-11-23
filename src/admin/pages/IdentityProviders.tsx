// @ts-nocheck
import { Button } from "@ui/components/button";
import { Switch } from "@ui/components/switch";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { AdminPage, Chip, Group, ListSkeleton, Notice, Pager, SearchField, Section, TextAction } from "../ui/kit";
import { useT } from "../ui/i18n";
import { useRealm } from "../ui/realm";
import { IdpCreateModal } from "./idp/IdpCreateModal";
import { ConfirmDialog, OpenRow, useServerInfo } from "./idp/shared";

const PAGE = 20;

export default function IdentityProviders() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const server = useServerInfo();
    const [confirmOpts, setConfirmOpts] = useState<any>(null);

    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [attempt, setAttempt] = useState(0);
    const [providers, setProviders] = useState<any[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [first, setFirst] = useState(0);
    const [searchInput, setSearchInput] = useState("");
    const [query, setQuery] = useState("");
    const [realmOnly, setRealmOnly] = useState(false);
    const [addOpen, setAddOpen] = useState(false);

    useEffect(() => {
        const id = setTimeout(() => {
            setFirst(0);
            setQuery(searchInput.trim());
        }, 300);
        return () => clearTimeout(id);
    }, [searchInput]);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        const params: any = { first, max: PAGE + 1, realmOnly };
        if (query) params.search = query;
        adminClient.identityProviders
            .find(params)
            .then(list => {
                if (!alive) return;
                const safe = Array.isArray(list) ? list : [];
                setHasMore(safe.length > PAGE);
                setProviders(safe.slice(0, PAGE));
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, attempt, first, query, realmOnly]);

    const remove = (idp: any) =>
        setConfirmOpts({
            title: t("sxIdpsDeleteTitle"),
            message: t("sxIdpsDeleteMessage", { name: idp.displayName || idp.alias }),
            confirmLabel: t("sxCommonDelete"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.identityProviders.del({ alias: idp.alias });
                    addAlert(t("sxIdpsDeleted"), AlertVariant.success);
                    setAttempt(n => n + 1);
                } catch (e) {
                    addError(t("sxIdpsDeleteError"), e);
                }
            }
        });

    const filtered = !!query || realmOnly;
    const newButton = (size?: string) => (
        <Button size={size} onClick={() => setAddOpen(true)}>
            {t("sxIdpsNew")}
        </Button>
    );

    return (
        <AdminPage title={t("sxNavIdentityProviders")} description={t("sxIdpsDescription")} actions={newButton()}>
            <div className="flex flex-col gap-3">
                <SearchField value={searchInput} onChange={setSearchInput} placeholder={t("sxIdpsSearchPlaceholder")} />
                <Group>
                    <li className="flex min-h-13 items-center justify-between gap-3 px-4 py-2.5">
                        <span className="text-[15px]">{t("sxIdpsHideOrgLinked")}</span>
                        <Switch
                            checked={realmOnly}
                            aria-label={t("sxIdpsHideOrgLinked")}
                            onCheckedChange={(v: boolean) => {
                                setFirst(0);
                                setRealmOnly(v);
                            }}
                        />
                    </li>
                </Group>
            </div>
            <Section label={t("sxIdpsListLabel")}>
                {status === "loading" && <ListSkeleton />}
                {status === "error" && (
                    <Notice
                        title={t("sxIdpsLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setAttempt(n => n + 1)}
                    />
                )}
                {status === "ready" && providers.length === 0 && (
                    <Notice
                        title={filtered ? t("sxIdpsNoMatch") : t("sxIdpsEmpty")}
                        description={filtered ? t("sxCommonTryDifferentSearch") : t("sxIdpsEmptyDescription")}
                        action={
                            filtered ? (
                                <Button
                                    size="sm"
                                    variant="plain"
                                    onClick={() => {
                                        setSearchInput("");
                                        setRealmOnly(false);
                                    }}
                                >
                                    {t("sxEventsClearFilters")}
                                </Button>
                            ) : (
                                newButton("sm")
                            )
                        }
                    />
                )}
                {status === "ready" && providers.length > 0 && (
                    <Group>
                        {providers.map(idp => (
                            <OpenRow
                                key={idp.alias}
                                testId={`idp-${idp.alias}`}
                                onOpen={() => navigate(`/${realm}/identity-providers/${idp.alias}`)}
                                title={idp.displayName || idp.alias}
                                subtitle={
                                    <>
                                        <span className="font-mono">{idp.alias}</span>
                                        {" · "}
                                        {idp.providerId}
                                        {idp.organizationId && (
                                            <>
                                                {" · "}
                                                <button
                                                    type="button"
                                                    className="text-primary hover:underline"
                                                    onClick={() => navigate(`/${realm}/organizations/${idp.organizationId}`)}
                                                >
                                                    {t("sxIdpsLinkedOrganization")}
                                                </button>
                                            </>
                                        )}
                                    </>
                                }
                                trailing={
                                    <>
                                        <span className="hidden sm:inline-flex">
                                            <Chip tone={idp.enabled ? "success" : "neutral"}>
                                                {idp.enabled ? t("sxCommonEnabled") : t("sxCommonDisabled")}
                                            </Chip>
                                        </span>
                                        <TextAction tone="danger" onClick={() => remove(idp)}>
                                            {t("sxCommonDelete")}
                                        </TextAction>
                                    </>
                                }
                            />
                        ))}
                    </Group>
                )}
                {status === "ready" && (
                    <div className="mt-3">
                        <Pager
                            page={Math.floor(first / PAGE) + 1}
                            hasPrev={first > 0}
                            hasNext={hasMore}
                            onPrev={() => setFirst(f => Math.max(0, f - PAGE))}
                            onNext={() => setFirst(f => f + PAGE)}
                        />
                    </div>
                )}
            </Section>

            {addOpen && (
                <IdpCreateModal
                    server={server}
                    existing={new Set(providers.map(p => p.alias))}
                    onClose={() => setAddOpen(false)}
                    onCreated={(alias: string) => {
                        setAddOpen(false);
                        navigate(`/${realm}/identity-providers/${alias}`);
                    }}
                />
            )}

            <ConfirmDialog opts={confirmOpts} setOpts={setConfirmOpts} />
        </AdminPage>
    );
}
