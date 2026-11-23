// @ts-nocheck

import { cn } from "@ui/lib/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Page } from "../components/page/Page";
import { ResourcesTab } from "./ResourcesTab";

const TABS = [
  { key: "mine", label: "myResources" },
  { key: "shared", label: "sharedWithMe" },
] as const;

export const Resources = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState<"mine" | "shared">("mine");

  return (
    <Page title={t("resources")} description={t("resourceIntroMessage")}>
      <div className="flex flex-col gap-5">
        <div
          role="tablist"
          className="flex gap-1 self-start rounded-xl bg-[#e5e5ea] p-1 dark:bg-[#1c1c1e]"
        >
          {TABS.map((tab) => {
            const selected = active === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                id={`resources-tab-${tab.key}`}
                aria-selected={selected}
                aria-controls={`resources-panel-${tab.key}`}
                data-testid={tab.label}
                onClick={() => setActive(tab.key)}
                className={cn(
                  "rounded-[9px] px-4 py-1.75 text-[15px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                  selected
                    ? "bg-white font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-[#3a3a3c]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(tab.label)}
              </button>
            );
          })}
        </div>
        <div
          role="tabpanel"
          id={`resources-panel-${active}`}
          aria-labelledby={`resources-tab-${active}`}
        >
          <ResourcesTab key={active} isShared={active === "shared"} />
        </div>
      </div>
    </Page>
  );
};

export default Resources;
