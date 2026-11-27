import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

const Navbar = React.forwardRef(
  /**
   * @param {React.HTMLAttributes<HTMLElement>} props
   * @param {React.ForwardedRef<HTMLElement>} ref
   */
  (props, ref) => {
    const { className, children, ...rest } = props
    return (
      <nav
        ref={ref}
        className={cn(
          "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          className
        )}
        {...rest}
      >
        {children}
      </nav>
    )
  }
)
Navbar.displayName = "Navbar"

const NavbarContent = React.forwardRef(
  /**
   * @param {React.HTMLAttributes<HTMLDivElement>} props
   * @param {React.ForwardedRef<HTMLDivElement>} ref
   */
  (props, ref) => {
    const { className, children, ...rest } = props
    return (
      <div
        ref={ref}
        className={cn("container flex h-16 items-center", className)}
        {...rest}
      >
        {children}
      </div>
    )
  }
)
NavbarContent.displayName = "NavbarContent"

const NavbarBrand = React.forwardRef(
  /**
   * @param {React.HTMLAttributes<HTMLDivElement>} props
   * @param {React.ForwardedRef<HTMLDivElement>} ref
   */
  (props, ref) => {
    const { className, children, ...rest } = props
    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-2", className)}
        {...rest}
      >
        {children}
      </div>
    )
  }
)
NavbarBrand.displayName = "NavbarBrand"

const NavbarItem = React.forwardRef(
  /**
   * @param {React.HTMLAttributes<HTMLDivElement>} props
   * @param {React.ForwardedRef<HTMLDivElement>} ref
   */
  (props, ref) => {
    const { className, children, ...rest } = props
    return (
      <div
        ref={ref}
        className={cn("flex items-center", className)}
        {...rest}
      >
        {children}
      </div>
    )
  }
)
NavbarItem.displayName = "NavbarItem"

const NavbarMenuToggle = React.forwardRef(
  /**
   * @param {React.ComponentPropsWithoutRef<typeof Button>} props
   * @param {React.ForwardedRef<HTMLButtonElement>} ref
   */
  (props, ref) => {
    const { className, ...rest } = props
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn("lg:hidden", className)}
        {...rest}
      />
    )
  }
)
NavbarMenuToggle.displayName = "NavbarMenuToggle"

const NavbarMenu = React.forwardRef(
  /**
   * @param {React.ComponentPropsWithoutRef<typeof Sheet> & { className?: string, isOpen?: boolean, onOpenChange?: (open: boolean) => void }} props
   * @param {React.ForwardedRef<any>} ref
   */
  (props, ref) => {
    const { className, children, isOpen, onOpenChange, ...rest } = props
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange} {...rest}>
        <SheetContent side="left" className={cn("w-[300px] sm:w-[400px]", className)}>
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription className="sr-only">
              Navigation menu for the application.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col space-y-4 mt-6">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    )
  }
)
NavbarMenu.displayName = "NavbarMenu"

const NavbarMenuItem = React.forwardRef(
  /**
   * @param {React.HTMLAttributes<HTMLDivElement>} props
   * @param {React.ForwardedRef<HTMLDivElement>} ref
   */
  (props, ref) => {
    const { className, children, ...rest } = props
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer",
          className
        )}
        {...rest}
      >
        {children}
      </div>
    )
  }
)
NavbarMenuItem.displayName = "NavbarMenuItem"

export {
  Navbar,
  NavbarContent,
  NavbarBrand,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
}
