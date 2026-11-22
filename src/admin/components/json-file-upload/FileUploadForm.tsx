/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/json-file-upload/FileUploadForm.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Button } from "@ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { Spinner } from "@ui/components/spinner";
import {
    type ChangeEvent,
    type DragEvent as ReactDragEvent,
    type MouseEvent as ReactMouseEvent,
    useState
} from "react";
import { useTranslation } from "react-i18next";
import CodeEditor from "../form/CodeEditor";

type FileUploadType = {
    value: string;
    filename: string;
    isLoading: boolean;
    modal: boolean;
};

export type FileUploadEvent =
    | ReactDragEvent<HTMLElement> // User dragged/dropped a file
    | ChangeEvent<HTMLTextAreaElement> // User typed in the TextArea
    | ReactMouseEvent<HTMLButtonElement, MouseEvent>; // User clicked Clear button

export type FileUploadFormProps = {
    id: string;
    extension: string;
    onChange: (value: string) => void;
    helpText?: string;
    unWrap?: boolean;
    language?: string;
    previewMaxLength?: number;
    hideDefaultPreview?: boolean;
    allowEditingUploadedText?: boolean;
    [key: string]: any;
};

export const FileUploadForm = ({
    id,
    onChange,
    helpText = "helpFileUpload",
    unWrap = false,
    previewMaxLength = 102400, // 100KB
    language,
    extension,
    ...rest
}: FileUploadFormProps) => {
    const { t } = useTranslation();
    const defaultUpload: FileUploadType = {
        value: "",
        filename: "",
        isLoading: false,
        modal: false
    };
    const [fileUpload, setFileUpload] = useState<FileUploadType>(defaultUpload);
    const removeDialog = () => setFileUpload(prev => ({ ...prev, modal: false }));

    const handleTextOrDataChange = (value: string) => {
        setFileUpload(prev => ({ ...prev, value }));
        onChange(value);
    };

    const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        setFileUpload(prev => ({ ...prev, filename: file.name, isLoading: true }));
        const reader = new FileReader();
        reader.onload = () => {
            const value = typeof reader.result === "string" ? reader.result : "";
            setFileUpload(prev => ({ ...prev, value, isLoading: false }));
            onChange(value);
        };
        reader.onerror = () => {
            setFileUpload(prev => ({ ...prev, isLoading: false }));
        };
        reader.readAsText(file);
    };

    const handleClear = () => {
        setFileUpload(prev => ({ ...prev, modal: true }));
    };

    const fileInput = (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <Input
                    data-testid={unWrap ? undefined : id}
                    id={id}
                    type="file"
                    accept={extension}
                    onChange={handleFileInputChange}
                />
                {fileUpload.isLoading && <Spinner />}
                {(fileUpload.filename || fileUpload.value) && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-testid="clear-button-trigger"
                        onClick={handleClear}
                    >
                        {t("clear")}
                    </Button>
                )}
            </div>
            {fileUpload.filename && (
                <p className="text-muted-foreground text-sm">{fileUpload.filename}</p>
            )}
            {!rest.hideDefaultPreview &&
                (!fileUpload.value || fileUpload.value.length < previewMaxLength ? (
                    <CodeEditor
                        aria-label="File content"
                        value={fileUpload.value}
                        language={language}
                        onChange={value => handleTextOrDataChange(value)}
                        readOnly={!rest.allowEditingUploadedText}
                    />
                ) : (
                    <CodeEditor
                        aria-label="File content"
                        value={t("fileUploadPreviewDisabled")}
                        readOnly
                    />
                ))}
        </div>
    );

    return (
        <>
            {fileUpload.modal && (
                <Modal open onOpenChange={o => !o && removeDialog()}>
                    <ModalContent>
                        <ModalHeader>
                            <ModalTitle>{t("clearFile")}</ModalTitle>
                        </ModalHeader>
                        <ModalBody>{t("clearFileExplain")}</ModalBody>
                        <ModalFooter>
                            <Button
                                data-testid="cancel"
                                key="cancel"
                                variant="secondary"
                                onClick={removeDialog}
                            >
                                {t("cancel")}
                            </Button>
                            <Button
                                key="confirm"
                                data-testid="clear-button"
                                onClick={() => {
                                    setFileUpload(defaultUpload);
                                    onChange("");
                                }}
                            >
                                {t("clear")}
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            )}
            {unWrap && fileInput}
            {!unWrap && (
                <Field>
                    <FieldLabel htmlFor={`${id}-filename`}>{t("resourceFile")}</FieldLabel>
                    {fileInput}
                    <FieldDescription>{t(helpText)}</FieldDescription>
                </Field>
            )}
        </>
    );
};
