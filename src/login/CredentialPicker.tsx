import { CheckIcon } from "@phosphor-icons/react";

type Props = {
    credentials: { id: string; userLabel: string }[];
    selectedId: string | undefined;
    ariaLabel: string;
    className?: string;
};

/**
 * Input-styled choice boxes (selected one gets a primary border and a check).
 * Real radios underneath, visually hidden, so keyboard and screen readers work and the form posts `selectedCredentialId`.
 */
export function CredentialPicker(props: Props) {
    const { credentials, selectedId, ariaLabel, className } = props;

    return (
        <div role="radiogroup" aria-label={ariaLabel} className={`flex w-full flex-col gap-2 ${className ?? ""}`}>
            {credentials.map((credential, index) => (
                <label
                    key={credential.id}
                    htmlFor={`kc-otp-credential-${index}`}
                    className="flex h-13.5 cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 text-left text-[17px] has-checked:border-primary has-focus-visible:ring-1 has-focus-visible:ring-ring dark:bg-foreground/6"
                >
                    <input
                        type="radio"
                        id={`kc-otp-credential-${index}`}
                        name="selectedCredentialId"
                        value={credential.id}
                        defaultChecked={credential.id === selectedId}
                        className="peer sr-only"
                    />
                    {credential.userLabel}
                    <CheckIcon weight="bold" aria-hidden className="hidden size-4 shrink-0 text-primary peer-checked:block" />
                </label>
            ))}
        </div>
    );
}
