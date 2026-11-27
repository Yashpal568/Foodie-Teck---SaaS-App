import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

/**
 * @typedef {Object} TabsListProps
 * @property {string} [className]
 * @property {React.ReactNode} children
 */

const TabsList = React.forwardRef(
  /** @param {TabsListProps & React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>} props */
  ({ className, children, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  >
    {children}
  </TabsPrimitive.List>
))
TabsList.displayName = TabsPrimitive.List.displayName

/**
 * @typedef {Object} TabsTriggerProps
 * @property {string} [className]
 * @property {React.ReactNode} children
 */

const TabsTrigger = React.forwardRef(
  /** @param {TabsTriggerProps & React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>} props */
  ({ className, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  >
    {children}
  </TabsPrimitive.Trigger>
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

/**
 * @typedef {Object} TabsContentProps
 * @property {string} [className]
 * @property {React.ReactNode} children
 */

const TabsContent = React.forwardRef(
  /** @param {TabsContentProps & React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>} props */
  ({ className, children, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  >
    {children}
  </TabsPrimitive.Content>
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
