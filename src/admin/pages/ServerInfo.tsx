// @ts-nocheck
import { ArrowSquareOutIcon, CaretDownIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import { cn } from "@ui/lib/utils";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminClient } from "../admin-client";
import { environment } from "../environment";
import { helpUrls } from "../shell/help";
import { useT } from "../ui/i18n";
import { AdminPage, Chip, Group, GROUP, ListSkeleton, Notice, SearchField, Section, SegmentTabs, SEPARATOR } from "../ui/kit";
import { useRealm } from "../ui/realm";

function InfoRow({ label, value }: { label: string; value: any }) {
    return (
        <li className="flex min-h-12 items-center justify-between gap-4 px-4 py-3">
            <span className="shrink-0 text-[15px]">{label}</span>
            <span className="min-w-0 text-end text-[15px] text-muted-foreground [overflow-wrap:anywhere]">
                {value === undefined || value === null || value === "" ? "—" : value}
            </span>
        </li>
    );
}

function featureTone(type: string) {
    if (type === "DEFAULT" || type === "DISABLED_BY_DEFAULT") return "success";
    if (type === "PREVIEW" || type === "PREVIEW_DISABLED_BY_DEFAULT") return "info";
    if (type === "EXPERIMENTAL") return "warning";
    if (type === "DEPRECATED") return "neutral";
    return "danger";
}

const FEATURE_TYPE_KEYS: Record<string, string> = {
    DEFAULT: "sxServerInfoTypeDefault",
    DISABLED_BY_DEFAULT: "sxServerInfoTypeDisabledByDefault",
    PREVIEW: "sxServerInfoTypePreview",
    PREVIEW_DISABLED_BY_DEFAULT: "sxServerInfoTypePreviewDisabledByDefault",
    EXPERIMENTAL: "sxServerInfoTypeExperimental",
    DEPRECATED: "sxServerInfoTypeDeprecated"
};

function FeatureList({ features }: { features: any[] }) {
    const t = useT();
    return (
        <Group>
            {features.map(feature => (
                <li key={feature.name} className="flex min-h-12 items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                        <div className="text-[15px] font-medium [overflow-wrap:anywhere]">{feature.name}</div>
                        {feature.label && feature.label !== feature.name && (
                            <div className="mt-0.5 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">{feature.label}</div>
                        )}
                    </div>
                    <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                        <Chip tone={featureTone(feature.type)}>
                            {FEATURE_TYPE_KEYS[feature.type] ? t(FEATURE_TYPE_KEYS[feature.type]) : feature.type}
                        </Chip>
                        {feature.deprecated && feature.type !== "DEPRECATED" && (
                            <Chip tone="neutral">{t("sxServerInfoTypeDeprecated")}</Chip>
                        )}
                    </span>
                </li>
            ))}
        </Group>
    );
}

function ProviderRow({ spi, info }: { spi: string; info: any }) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const providers = Object.entries(info?.providers || {}).sort(([a], [b]) => a.localeCompare(b));
    return (
        <li>
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen(o => !o)}
                className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-black/3 focus-visible:bg-black/5 dark:hover:bg-white/4 dark:focus-visible:bg-white/6"
            >
                <span className="min-w-0">
                    <span className="block text-[15px] font-medium [overflow-wrap:anywhere]">{spi}</span>
                    <span className="mt-0.5 block text-[13px] text-muted-foreground">
                        {t("sxServerInfoProviderCount", { total: providers.length })}
                    </span>
                </span>
                <CaretDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
            </button>
            {open && (
                <ul className="flex flex-col gap-2 px-4 pb-4">
                    {providers.map(([id, provider]: any) => (
                        <ProviderItem key={id} id={id} provider={provider} />
                    ))}
                </ul>
            )}
        </li>
    );
}

function ProviderItem({ id, provider }: { id: string; provider: any }) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const details = Object.entries(provider?.operationalInfo || {});
    return (
        <li className="rounded-lg bg-background px-3 py-2.5 dark:bg-[#2c2c2e]">
            <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 font-mono text-[13px] [overflow-wrap:anywhere]">{id}</span>
                {details.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setOpen(o => !o)}
                        className="shrink-0 rounded-md text-[13px] font-medium text-primary outline-none hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                        {open ? t("sxServerInfoShowLess") : t("sxServerInfoShowMore")}
                    </button>
                )}
            </div>
            {open && (
                <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-[13px] sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                    {details.map(([key, value]) => (
                        <Fragment key={key}>
                            <dt className="text-muted-foreground [overflow-wrap:anywhere]">{key}</dt>
                            <dd className="mb-1 [overflow-wrap:anywhere] sm:mb-0">{String(value)}</dd>
                        </Fragment>
                    ))}
                </dl>
            )}
        </li>
    );
}

function Resources() {
    const t = useT();
    const links = [
        { href: helpUrls.documentation, label: t("sxServerInfoDocumentation") },
        { href: helpUrls.guides, label: t("sxServerInfoGuides") },
        { href: helpUrls.community, label: t("sxServerInfoCommunity") },
        { href: helpUrls.blog, label: t("sxServerInfoBlog") }
    ];
    return (
        <Section label={t("sxServerInfoResources")}>
            <Group>
                {links.map(link => (
                    <li key={link.href}>
                        <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 text-[15px] outline-none transition-colors hover:bg-black/3 focus-visible:bg-black/5 dark:hover:bg-white/4 dark:focus-visible:bg-white/6"
                        >
                            <span className="min-w-0 truncate">{link.label}</span>
                            <ArrowSquareOutIcon className="size-4 shrink-0 text-muted-foreground" />
                        </a>
                    </li>
                ))}
            </Group>
        </Section>
    );
}

export default function ServerInfo() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const isMaster = realm === "master";
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [info, setInfo] = useState<any>(null);
    const [attempt, setAttempt] = useState(0);
    const [tab, setTab] = useState<"server" | "features" | "providers">("server");
    const [query, setQuery] = useState("");

    useEffect(() => {
        if (!isMaster) return;
        let alive = true;
        setStatus("loading");
        adminClient.serverInfo
            .find()
            .then(result => {
                if (!alive) return;
                setInfo(result ?? {});
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, isMaster, attempt]);

    const features = useMemo(
        () => [...(info?.features || [])].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
        [info]
    );
    const enabledFeatures = features.filter(f => f.enabled);
    const disabledFeatures = features.filter(f => !f.enabled);

    const providers = useMemo(() => {
        const q = query.trim().toLowerCase();
        return Object.entries(info?.providers || {})
            .filter(
                ([spi, value]: any) =>
                    !q ||
                    spi.toLowerCase().includes(q) ||
                    Object.keys(value?.providers || {}).some(id => id.toLowerCase().includes(q))
            )
            .sort(([a], [b]) => a.localeCompare(b));
    }, [info, query]);

    if (!isMaster) {
        return (
            <AdminPage title={t("sxShellRealmInfo")} description={t("sxServerInfoRealmDescription", { name: realm })}>
                <Notice
                    title={t("sxServerInfoMasterOnly")}
                    description={t("sxServerInfoMasterOnlyDescription")}
                    action={
                        environment.realm === "master" ? (
                            <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => navigate("/master/server-info")}>
                                {t("sxServerInfoOpenMaster")}
                            </Button>
                        ) : undefined
                    }
                />
                <Resources />
            </AdminPage>
        );
    }

    const system = info?.systemInfo || {};
    const memory = info?.memoryInfo || {};

    return (
        <AdminPage title={t("sxShellServerInfo")} description={t("sxServerInfoDescription")}>
            <SegmentTabs
                value={tab}
                onChange={setTab}
                ariaLabel={t("sxShellServerInfo")}
                items={[
                    { value: "server", label: t("sxServerInfoTabServer") },
                    { value: "features", label: t("sxServerInfoTabFeatures") },
                    { value: "providers", label: t("sxServerInfoTabProviders") }
                ]}
            />

            {status === "loading" && <ListSkeleton rows={4} />}
            {status === "error" && (
                <Notice
                    title={t("sxServerInfoLoadError")}
                    description={t("sxLoadErrorDescription")}
                    onRetry={() => setAttempt(n => n + 1)}
                />
            )}

            {status === "ready" && tab === "server" && (
                <>
                    <Section label={t("sxServerInfoServer")}>
                        <Group>
                            <InfoRow label={t("sxServerInfoVersion")} value={system.version} />
                            <InfoRow label={t("sxServerInfoProfile")} value={info?.profileInfo?.name} />
                            <InfoRow label={t("sxServerInfoUptime")} value={system.uptime} />
                            <InfoRow label={t("sxServerInfoJavaVersion")} value={system.javaVersion} />
                            <InfoRow label={t("sxServerInfoOs")} value={[system.osName, system.osVersion, system.osArchitecture].filter(Boolean).join(" · ")} />
                            <InfoRow label={t("sxServerInfoProcessorCount")} value={info?.cpuInfo?.processorCount} />
                        </Group>
                    </Section>
                    <Section label={t("sxServerInfoMemory")}>
                        <Group>
                            <InfoRow label={t("sxServerInfoTotalMemory")} value={memory.totalFormated} />
                            <InfoRow label={t("sxServerInfoFreeMemory")} value={memory.freeFormated} />
                            <InfoRow label={t("sxServerInfoUsedMemory")} value={memory.usedFormated} />
                        </Group>
                    </Section>
                    <Resources />
                </>
            )}

            {status === "ready" && tab === "features" && (
                <>
                    <Section label={t("sxServerInfoEnabledFeatures", { total: enabledFeatures.length })}>
                        {enabledFeatures.length ? (
                            <FeatureList features={enabledFeatures} />
                        ) : (
                            <Notice title={t("sxServerInfoNoFeatures")} />
                        )}
                    </Section>
                    <Section label={t("sxServerInfoDisabledFeatures", { total: disabledFeatures.length })}>
                        {disabledFeatures.length ? (
                            <FeatureList features={disabledFeatures} />
                        ) : (
                            <Notice title={t("sxServerInfoNoFeatures")} />
                        )}
                    </Section>
                </>
            )}

            {status === "ready" && tab === "providers" && (
                <>
                    <SearchField value={query} onChange={setQuery} placeholder={t("sxServerInfoProvidersSearch")} />
                    <Section label={t("sxServerInfoProviderInfo")}>
                        {providers.length === 0 ? (
                            <Notice
                                title={query.trim() ? t("sxServerInfoNoProvidersMatch") : t("sxServerInfoNoProviders")}
                                description={query.trim() ? t("sxServerInfoNoProvidersMatchDescription") : undefined}
                            />
                        ) : (
                            <ul className={GROUP}>
                                {providers.map(([spi, value], index) => (
                                    <Fragment key={spi}>
                                        {index > 0 && <li aria-hidden className={SEPARATOR} />}
                                        <ProviderRow spi={spi} info={value} />
                                    </Fragment>
                                ))}
                            </ul>
                        )}
                    </Section>
                </>
            )}
        </AdminPage>
    );
}
