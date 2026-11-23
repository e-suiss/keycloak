// @ts-nocheck

import { Button } from "@ui/components/button";
import { NativeSelect, NativeSelectOption } from "@ui/components/native-select";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import { getIssuer, requestVCOffer } from "../api";
import type { CredentialsIssuer } from "../api/representations";
import { Page } from "../components/page/Page";
import { Bar, ListSkeleton } from "../root/Skeleton";

const GROUP =
  "w-full overflow-hidden rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] text-left dark:border-[#38383a] dark:bg-[#1c1c1e]";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; issuer: CredentialsIssuer };

type Offer =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; src: string };

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

function readAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("read"));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export const Oid4Vci = () => {
  const context = useEnvironment();
  const { t } = useTranslation();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState("");
  const [offer, setOffer] = useState<Offer>({ status: "idle" });
  const [offerAttempt, setOfferAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    getIssuer(context)
      .then((issuer) => active && setState({ status: "ready", issuer }))
      .catch(() => active && setState({ status: "error" }));
    return () => {
      active = false;
    };
  }, [attempt]);

  const configurations =
    state.status === "ready"
      ? (state.issuer.credential_configurations_supported ?? {})
      : {};
  const options = Object.keys(configurations);

  useEffect(() => {
    if (!selected || state.status !== "ready") {
      setOffer({ status: "idle" });
      return;
    }
    let active = true;
    setOffer({ status: "loading" });
    requestVCOffer(
      context,
      {
        ...configurations[selected],
        id: configurations[selected]?.id ?? selected,
      },
      state.issuer,
    )
      .then((blob) => {
        if (!blob?.type?.startsWith("image/")) throw new Error("offer");
        return readAsDataUrl(blob);
      })
      .then((src) => active && setOffer({ status: "ready", src }))
      .catch(() => active && setOffer({ status: "error" }));
    return () => {
      active = false;
    };
  }, [selected, state, offerAttempt]);

  return (
    <Page
      title={t("verifiableCredentialsTitle")}
      description={t("verifiableCredentialsDescription")}
    >
      <h2 className="mb-2 ms-0.5 text-center text-sm font-medium text-muted-foreground">
        {t("verifiableCredentialsSection")}
      </h2>

      {state.status === "loading" && <ListSkeleton />}

      {state.status === "error" && (
        <Notice
          title={t("verifiableCredentialsLoadError")}
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

      {state.status === "ready" && options.length === 0 && (
        <Notice
          title={t("verifiableCredentialsEmpty")}
          description={t("verifiableCredentialsDescription")}
        />
      )}

      {state.status === "ready" && options.length > 0 && (
        <div className={`${GROUP} p-4`}>
          <NativeSelect
            size="lg"
            data-testid="credential-select"
            aria-label={t("verifiableCredentialsSection")}
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className="w-full [&_select]:data-[size=lg]:text-base [&_select]:bg-background dark:[&_select]:bg-[#2c2c2e]"
          >
            <NativeSelectOption value="" disabled>
              {t("verifiableCredentialsSelectionDefault")}
            </NativeSelectOption>
            {options.map((option) => (
              <NativeSelectOption
                key={option}
                value={option}
                data-testid={option}
              >
                {option}
              </NativeSelectOption>
            ))}
          </NativeSelect>

          {offer.status === "loading" && (
            <div
              aria-busy="true"
              className="mx-auto mt-4 aspect-square w-full max-w-72 overflow-hidden rounded-xl"
            >
              <Bar className="size-full rounded-xl" />
            </div>
          )}

          {offer.status === "error" && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                {t("verifiableCredentialsOfferError")}
              </p>
              <Button
                size="sm"
                className="mt-3 h-8.5 px-4 font-medium"
                onClick={() => setOfferAttempt((n) => n + 1)}
              >
                {t("tryAgain")}
              </Button>
            </div>
          )}

          {offer.status === "ready" && (
            <div className="mx-auto mt-4 w-full max-w-72 rounded-xl bg-white p-3">
              <img
                src={offer.src}
                alt={selected}
                data-testid="qr-code"
                className="aspect-square w-full"
              />
            </div>
          )}
        </div>
      )}
    </Page>
  );
};

export default Oid4Vci;
