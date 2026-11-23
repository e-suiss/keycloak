// @ts-nocheck
import { Button } from "@ui/components/button";
import { Spinner } from "@ui/components/spinner";
import { Modal, ModalBody, ModalContent, ModalDescription, ModalHeader, ModalTitle } from "@ui/patterns/modal";
import { useState } from "react";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useT } from "../ui/i18n";
import { Group } from "../ui/kit";
import { useRealm } from "../ui/realm";

export function ClearCachesModal({ onClose }: { onClose: () => void }) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { addAlert, addError } = useAlerts();
    const [busy, setBusy] = useState<string | null>(null);

    const caches = [
        { key: "realm", label: t("sxShellRealmCache"), hint: t("sxShellRealmCacheHelp"), run: adminClient.cache.clearRealmCache },
        { key: "user", label: t("sxShellUserCache"), hint: t("sxShellUserCacheHelp"), run: adminClient.cache.clearUserCache },
        { key: "keys", label: t("sxShellKeysCache"), hint: t("sxShellKeysCacheHelp"), run: adminClient.cache.clearKeysCache },
        { key: "crl", label: t("sxShellCrlCache"), hint: t("sxShellCrlCacheHelp"), run: adminClient.cache.clearCrlCache }
    ];

    const clear = async (item: (typeof caches)[number]) => {
        setBusy(item.key);
        try {
            await item.run({ realm });
            addAlert(t("sxShellClearCacheSuccess"), AlertVariant.success);
        } catch (error) {
            addError("sxShellClearCacheError", error);
        } finally {
            setBusy(null);
        }
    };

    return (
        <Modal open onOpenChange={open => !open && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>{t("sxShellClearCaches")}</ModalTitle>
                    <ModalDescription>{t("sxShellClearCachesDescription")}</ModalDescription>
                </ModalHeader>
                <ModalBody>
                    <Group>
                        {caches.map(item => (
                            <li key={item.key} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
                                <div className="min-w-0">
                                    <div className="text-base font-medium">{item.label}</div>
                                    <div className="mt-0.5 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">{item.hint}</div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="tinted"
                                    className="h-8.5 shrink-0 px-4 font-medium"
                                    disabled={busy !== null}
                                    onClick={() => clear(item)}
                                >
                                    {busy === item.key ? <Spinner className="size-4" /> : t("sxShellClear")}
                                </Button>
                            </li>
                        ))}
                    </Group>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
