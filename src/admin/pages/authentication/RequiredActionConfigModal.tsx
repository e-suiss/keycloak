// @ts-nocheck

import { Button } from "@ui/components/button";
import { FieldGroup } from "@ui/components/field";
import { Spinner } from "@ui/components/spinner";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { useEffect, useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useT } from "../../ui/i18n";
import { ListSkeleton, Notice } from "../../ui/kit";
import { ConfigField, configDefaults, stringifyConfig } from "./ConfigField";

export function RequiredActionConfigModal({
    action,
    onClose,
    onConfirmClear
}: {
    action: any;
    onClose: () => void;
    onConfirmClear: (run: () => Promise<void>) => void;
}) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [properties, setProperties] = useState<any[]>([]);
    const [values, setValues] = useState<Record<string, any>>({});
    const [hasConfig, setHasConfig] = useState(false);
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [attempt, setAttempt] = useState(0);
    const [busy, setBusy] = useState(false);
    const alias = action.alias;

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        (async () => {
            const am = adminClient.authenticationManagement;
            const desc = await am.getRequiredActionConfigDescription({ alias });
            const cfg = await am.getRequiredActionConfig({ alias }).catch(() => null);
            return { desc, cfg };
        })()
            .then(({ desc, cfg }) => {
                if (!alive) return;
                const props = desc?.properties || [];
                const stored = cfg?.config || {};
                const has = Object.keys(stored).length > 0;
                setProperties(props);
                setHasConfig(has);
                setValues(has ? { ...stored } : configDefaults(props));
                setStatus("ready");
            })
            .catch(() => {
                if (alive) setStatus("error");
            });
        return () => {
            alive = false;
        };
    }, [alias, attempt]);

    const save = async () => {
        setBusy(true);
        try {
            await adminClient.authenticationManagement.updateRequiredActionConfig(
                { alias },
                { config: stringifyConfig(values) }
            );
            addAlert(t("sxAuthXRequiredActionConfigSaved"), AlertVariant.success);
            onClose();
        } catch (err) {
            addError(t("sxAuthStepConfigSaveError"), err);
        } finally {
            setBusy(false);
        }
    };

    const clear = () =>
        onConfirmClear(async () => {
            try {
                await adminClient.authenticationManagement.removeRequiredActionConfig({ alias });
                addAlert(t("sxAuthXRequiredActionConfigCleared"), AlertVariant.success);
                onClose();
            } catch (err) {
                addError(t("sxAuthXRequiredActionConfigClearError"), err);
            }
        });

    const ready = status === "ready" && properties.length > 0;

    return (
        <Modal open onOpenChange={o => !o && !busy && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>{t("sxAuthConfigTitle", { name: action.name || alias })}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {status === "loading" ? (
                        <ListSkeleton rows={2} />
                    ) : status === "error" ? (
                        <Notice
                            title={t("sxAuthXRequiredActionConfigLoadError")}
                            description={t("sxLoadErrorDescription")}
                            onRetry={() => setAttempt(n => n + 1)}
                        />
                    ) : properties.length === 0 ? (
                        <Notice
                            title={t("sxAuthNoConfigTitle")}
                            description={t("sxAuthXRequiredActionNoConfigDescription")}
                        />
                    ) : (
                        <FieldGroup>
                            {properties.map((p: any) => (
                                <ConfigField
                                    key={p.name}
                                    prop={p}
                                    value={values[p.name]}
                                    onChange={(v: any) => setValues(s => ({ ...s, [p.name]: v }))}
                                />
                            ))}
                        </FieldGroup>
                    )}
                </ModalBody>
                {ready && (
                    <ModalFooter>
                        {hasConfig && (
                            <Button
                                variant="plain"
                                onClick={clear}
                                disabled={busy}
                                className="text-[#d70015] dark:text-[#ff453a]"
                            >
                                {t("sxAuthXClearConfig")}
                            </Button>
                        )}
                        <Button onClick={save} disabled={busy}>
                            {busy && <Spinner data-icon="inline-start" />}
                            {t("sxAuthSave")}
                        </Button>
                    </ModalFooter>
                )}
            </ModalContent>
        </Modal>
    );
}
