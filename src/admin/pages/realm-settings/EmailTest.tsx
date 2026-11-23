// @ts-nocheck

import { Button } from "@ui/components/button";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { environment } from "../../environment";
import { useT } from "../../ui/i18n";
import { GROUP, Section } from "../../ui/kit";
import { ActionRow } from "./fields";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SmtpTestConnection({ realm, smtp }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [user, setUser] = useState<any>(undefined);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const who = await adminClient.whoAmI.find({
                    realm: environment.realm,
                    currentRealm: realm
                });
                const me = await adminClient.users.findOne({ id: who.userId, realm: who.realm });
                if (alive) setUser(me ? { ...me, realm: who.realm } : null);
            } catch {
                if (alive) setUser(null);
            }
        })();
        return () => {
            alive = false;
        };
    }, [realm]);

    const ready = EMAIL_RE.test(String(smtp.from || "")) && !!smtp.host;

    const test = async () => {
        const settings: any = { ...smtp };
        const bool = (v: any) => v === true || v === "true";
        settings.port = settings.port === "" || settings.port == null ? null : Number(settings.port) || null;
        settings.ssl = bool(settings.ssl);
        settings.starttls = bool(settings.starttls);
        settings.auth = bool(settings.auth);
        setTesting(true);
        try {
            await adminClient.realms.testSMTPConnection({ realm }, settings);
            addAlert(t("sxRealmSettingsTestConnectionSuccess", { email: user?.email }), AlertVariant.success);
        } catch (err) {
            addError(t("sxRealmSettingsTestConnectionError"), err);
        } finally {
            setTesting(false);
        }
    };

    const hint =
        user === undefined
            ? t("sxRealmSettingsTestConnectionChecking")
            : user?.email
              ? t("sxRealmSettingsTestConnectionHint", { email: user.email })
              : t("sxRealmSettingsTestConnectionNoEmail", { username: user?.username || "—" });

    return (
        <Section label={t("sxRealmSettingsTestConnection")}>
            <div className={GROUP}>
                <ActionRow label={t("sxRealmSettingsTestConnection")} hint={hint}>
                    {user && !user.email && (
                        <Button asChild variant="plain">
                            <Link to={`/${encodeURIComponent(user.realm)}/users/${user.id}`}>
                                {t("sxRealmSettingsTestConnectionSetEmail")}
                            </Link>
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        onClick={test}
                        disabled={testing || !ready || !user?.email}
                    >
                        {testing ? t("sxRealmSettingsTestingConnection") : t("sxRealmSettingsTestConnection")}
                    </Button>
                </ActionRow>
            </div>
            {!ready && <p className="mt-2 px-0.5 text-[13px] text-muted-foreground">{t("sxRealmSettingsTestConnectionNeedsHost")}</p>}
        </Section>
    );
}
