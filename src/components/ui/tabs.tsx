"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   Tabs Context
   ------------------------------------------------------------------ */
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error("Tabs compound components must be used within <Tabs>");
  }
  return ctx;
}

/* ------------------------------------------------------------------
   Tabs (root)
   ------------------------------------------------------------------ */
interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The currently active tab value */
  value?: string;
  /** Called when the active tab changes */
  onValueChange?: (value: string) => void;
  /** The default active tab (uncontrolled) */
  defaultValue?: string;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      className,
      value: controlledValue,
      onValueChange,
      defaultValue = "",
      children,
      ...props
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] =
      React.useState(defaultValue);

    const isControlled = controlledValue !== undefined;
    const activeTab = isControlled ? controlledValue : uncontrolledValue;

    const setActiveTab = React.useCallback(
      (newValue: string) => {
        if (!isControlled) {
          setUncontrolledValue(newValue);
        }
        onValueChange?.(newValue);
      },
      [isControlled, onValueChange]
    );

    return (
      <TabsContext.Provider value={{ activeTab, setActiveTab }}>
        <div ref={ref} className={cn("w-full", className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);
Tabs.displayName = "Tabs";

/* ------------------------------------------------------------------
   TabsList
   ------------------------------------------------------------------ */
interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        "flex items-center gap-0",
        "border-b-2 border-rule",
        "overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0",
        className
      )}
      {...props}
    />
  )
);
TabsList.displayName = "TabsList";

/* ------------------------------------------------------------------
   TabsTrigger
   ------------------------------------------------------------------ */
interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The value that this trigger activates */
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, onClick, children, ...props }, ref) => {
    const { activeTab, setActiveTab } = useTabsContext();
    const isActive = activeTab === value;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        tabIndex={isActive ? 0 : -1}
        onClick={(e) => {
          onClick?.(e);
          setActiveTab(value);
        }}
        className={cn(
          "relative inline-flex items-center justify-center",
          "whitespace-nowrap px-3 py-3 sm:px-4 sm:py-2.5 -mb-[2px]",
          "text-[10px] font-semibold uppercase tracking-[0.15em]",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-editorial-red focus-visible:ring-offset-1",
          "select-none cursor-pointer",
          // Default (inactive)
          "text-ink-muted hover:text-ink",
          "border-b-2 border-transparent",
          // Active
          isActive && [
            "text-editorial-red",
            "border-b-2 border-editorial-red",
          ],
          // Disabled
          "disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

/* ------------------------------------------------------------------
   TabsContent
   ------------------------------------------------------------------ */
interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The value that activates this content panel */
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const { activeTab } = useTabsContext();
    const isActive = activeTab === value;

    if (!isActive) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        tabIndex={0}
        className={cn("mt-4 focus-visible:outline-none", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
export type {
  TabsProps,
  TabsListProps,
  TabsTriggerProps,
  TabsContentProps,
};
