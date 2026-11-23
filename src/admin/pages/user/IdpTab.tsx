// @ts-nocheck

import { Button } from "@ui/components/button";
import { useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useT } from "../../ui/i18n";
import { Group, Row, Section, TextAction } from "../../ui/kit";
import { LinkIdpModal } from "./modals";
import { ListState, Monogram, asList, useConfirm, useResource } from "./shared";

export function IdpTab({ user }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirm();
    const [linking, setLinking] = useState(false);
    const res = useResource(
        () => adminClient.users.listFederatedIdentities({ id: user.id }).then(asList),
        [adminClient, user.id]
    );
    const links = res.data || [];

    const unlink = (l: any) =>
        confirm({
            title: t("sxUserDetailUnlinkIdp"),
            message: t("sxUserDetailUnlinkIdpConfirm", { name: l.identityProvider }),
            confirmLabel: t("sxCommonRemove"),
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.users.delFromFederatedIdentity({
                        id: user.id,
                        federatedIdentityId: l.identityProvider
                    });
                    addAlert(t("sxUserDetailIdpUnlinked"), AlertVariant.success);
                    res.setData((list: any[]) => (list || []).filter(x => x.identityProvider !== l.identityProvider));
                } catch (e) {
                    addError(t("sxCommonRemoveError"), e);
                }
            }
        });

    return (
        <Section
            label={t("sxUserDetailIdpLinks")}
            action={res.status === "ready" && <TextAction onClick={() => setLinking(true)}>{t("sxUserDetailXLinkIdp")}</TextAction>}
        >
            <ListState
                status={res.status}
                count={links.length}
                onRetry={res.reload}
                errorTitle={t("sxUserDetailIdpLinksLoadError")}
                emptyTitle={t("sxUserDetailNoIdpLinks")}
                emptyDescription={t("sxUserDetailNoIdpLinksDescription")}
                emptyAction={
                    <Button size="sm" className="h-8.5 px-4 font-medium" onClick={() => setLinking(true)}>
                        {t("sxUserDetailXLinkIdp")}
                    </Button>
                }
            >
                <Group>
                    {links.map(l => (
                        <Row
                            key={l.identityProvider}
                            leading={<Monogram name={l.identityProvider} />}
                            title={l.identityProvider}
                            subtitle={[l.userName, l.userId].filter(Boolean).join(" · ")}
                            trailing={
                                <TextAction tone="danger" onClick={() => unlink(l)}>
                                    {t("sxCommonRemove")}
                                </TextAction>
                            }
                        />
                    ))}
                </Group>
            </ListState>
            {linking && (
                <LinkIdpModal
                    userId={user.id}
                    linked={links.map((l: any) => l.identityProvider)}
                    onClose={() => setLinking(false)}
                    onLinked={() => {
                        setLinking(false);
                        res.reload();
                    }}
                />
            )}
            {confirmNode}
        </Section>
    );
}
