import { CheckIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { useState } from "react";
import type { I18n } from "../i18n";
import type { KcContext } from "../KcContext";
import { securityImageSrc } from "../../shared/securityImages";

/**
 * Anti-phishing security image — React counterpart of "security-image.ftl"
 * (Authenticator "security-image"). The server decides `mode`:
 *   - SELECT  : the user picks one image URL from `images`; posted as `securityImage`.
 *   - CONFIRM : `selectedImage` is shown; "Yes" posts securityImageConfirm=yes and
 *               continues, "No" posts =no and the server restarts the whole flow.
 * The catalog of URLs is admin-managed (authenticator config); the server is
 * image-agnostic and only stores/validates the chosen URL.
 */
export default function SecurityImage(props: PageProps<Extract<KcContext, { pageId: "security-image.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { msg, msgStr } = i18n;

    const { url, mode, images, selectedImage, message } = kcContext;

    const [chosen, setChosen] = useState<string | null>(null);

    const isConfirm = mode === "CONFIRM";

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={message !== undefined}
            headerNode={msg(isConfirm ? "sgConfirmTitle" : "sgTitle")}
        >
            {isConfirm ? (
                <form autoComplete="off" action={url.loginAction} method="post" className="-mt-1.5 flex flex-col items-center">
                    <div className="size-32.5 overflow-hidden rounded-[29px] bg-muted shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
                        {selectedImage && <img src={securityImageSrc(selectedImage)} alt="" className="size-full object-cover dark:[filter:invert(1)_hue-rotate(180deg)_brightness(1.25)]" />}
                    </div>
                    <div className="mt-7.5 flex w-full flex-col gap-1.5">
                        <Button type="submit" size="form" block name="securityImageConfirm" value="yes">
                            {msg("sgYes")}
                        </Button>
                        <Button type="submit" variant="plain" size="form" block name="securityImageConfirm" value="no">
                            {msg("sgNo")}
                        </Button>
                    </div>
                </form>
            ) : (
                <form autoComplete="off" action={url.loginAction} method="post" className="-mt-1.5 flex flex-col items-center">
                    <input type="hidden" name="securityImage" value={chosen ?? ""} />
                    <div role="radiogroup" aria-label={msgStr("sgTitle")} className="grid grid-cols-[repeat(3,92px)] gap-3">
                        {(images ?? []).map((src, i) => (
                            <label
                                key={src}
                                className="relative size-23 cursor-pointer rounded-[20px] has-checked:ring-2 has-checked:ring-primary has-focus-visible:ring-2 has-focus-visible:ring-ring/50"
                            >
                                <input
                                    type="radio"
                                    name="security-image-choice"
                                    value={src}
                                    checked={chosen === src}
                                    onChange={() => setChosen(src)}
                                    aria-label={`${i + 1}`}
                                    className="peer sr-only"
                                />
                                <img
                                    src={securityImageSrc(src)}
                                    alt=""
                                    className="size-full rounded-[20px] object-cover dark:[filter:invert(1)_hue-rotate(180deg)_brightness(1.25)] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.08)]"
                                />
                                <span
                                    aria-hidden="true"
                                    className="absolute -top-1.5 -right-1.5 hidden size-5.5 place-items-center rounded-full bg-primary text-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] peer-checked:grid"
                                >
                                    <CheckIcon weight="bold" className="size-3" />
                                </span>
                            </label>
                        ))}
                    </div>
                    <Button type="submit" size="form" block disabled={chosen === null} className="mt-7.5">
                        {msgStr("doContinue")}
                    </Button>
                </form>
            )}
        </Template>
    );
}
