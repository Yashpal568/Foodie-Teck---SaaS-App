import { useNavigate } from 'react-router-dom'
import { Search, Bell, User, Menu, ChefHat } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import CurrencySelector from '@/components/ui/currency-selector'
import NotificationDropdown from '@/components/ui/NotificationDropdown'
import Logo from '@/components/ui/Logo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from '@/components/ui/separator'
import { menuItems, supportItems } from './Sidebar'

export default function Navbar({ activeItem, setActiveItem, currency, onCurrencyChange }) {
  const navigate = useNavigate()

  const handleNavigation = (item) => {
    setActiveItem(item.id)
    navigate(item.route)
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Mobile Menu Trigger */}
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-600">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-white border-r">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">Access all dashboard sections</SheetDescription>
              <div className="flex flex-col h-full">
                {/* Logo in Drawer */}
                <div className="p-6 border-b border-gray-100 mb-2">
                  <Logo subtitle="Restaurant Dashboard" />
                </div>

                {/* Navigation Links in Drawer */}
                <nav className="flex-1 p-4 overflow-y-auto">
                  <div className="space-y-1.5">
                    {menuItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavigation(item)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                            activeItem === item.id
                              ? 'bg-blue-50 text-blue-600 font-bold'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm">{item.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-1.5">
                    {supportItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavigation(item)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                            activeItem === item.id
                              ? 'bg-blue-50 text-blue-600 font-bold'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm">{item.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search or type command..."
              className="pl-10 bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-4 ml-auto flex-shrink-0">
          {/* Currency Selector */}
          <div className="hidden md:block">
            <CurrencySelector 
              value={currency} 
              onChange={onCurrencyChange}
              className="border-gray-200"
            />
          </div>

          {/* Notifications Center */}
          <NotificationDropdown />

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 p-1 md:p-2 h-auto">
                <Avatar className="w-8 h-8">
                  <AvatarImage src="/api/placeholder/32/32" alt="User" className="aspect-square h-full w-full" />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                    JD
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium text-gray-800">John Doe</p>
                  <p className="text-xs text-gray-500">Restaurant Admin</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border shadow-xl rounded-xl">
              <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold" inset={undefined}>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="-mx-1 my-1 h-px bg-gray-100" />
              <DropdownMenuItem className="cursor-pointer flex items-center px-2 py-1.5 text-sm" inset={undefined}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer flex items-center px-2 py-1.5 text-sm" inset={undefined}>
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer flex items-center px-2 py-1.5 text-sm" inset={undefined}>
                <span>Restaurant Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="-mx-1 my-1 h-px bg-gray-100" />
              <DropdownMenuItem className="cursor-pointer text-red-600 flex items-center px-2 py-1.5 text-sm" inset={undefined}>
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
