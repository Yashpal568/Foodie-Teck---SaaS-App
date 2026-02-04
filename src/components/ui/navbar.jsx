import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Menu, X, Utensils, User, ShoppingCart, Timer } from "lucide-react"

const Navbar = React.forwardRef(({ className, children, ...props }, ref) => (
  <nav
    ref={ref}
    className={cn(
      "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}
    {...props}
  >
    {children}
  </nav>
))
Navbar.displayName = "Navbar"

const NavbarContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("container flex h-16 items-center", className)}
    {...props}
  />
))
NavbarContent.displayName = "NavbarContent"

const NavbarBrand = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-2", className)}
    {...props}
  >
    {children}
  </div>
))
NavbarBrand.displayName = "NavbarBrand"

const NavbarItem = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center", className)}
    {...props}
  />
))
NavbarItem.displayName = "NavbarItem"

const NavbarMenuToggle = React.forwardRef(({ className, ...props }, ref) => (
  <Button
    ref={ref}
    variant="ghost"
    size="icon"
    className={cn("md:hidden", className)}
    {...props}
  />
))
NavbarMenuToggle.displayName = "NavbarMenuToggle"

const NavbarMenu = React.forwardRef(({ className, children, isOpen, onOpenChange, ...props }, ref) => (
  <Sheet open={isOpen} onOpenChange={onOpenChange}>
    <SheetContent side="left" className="w-[300px] sm:w-[400px]">
      <SheetHeader>
        <SheetTitle>Menu</SheetTitle>
      </SheetHeader>
      <div className="flex flex-col space-y-4 mt-6">
        {children}
      </div>
    </SheetContent>
  </Sheet>
))
NavbarMenu.displayName = "NavbarMenu"

const NavbarMenuItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
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
