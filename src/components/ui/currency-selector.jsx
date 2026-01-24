import { useState } from 'react'
import { DollarSign, IndianRupee, Euro, PoundSterling, CircleDollarSign } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const currencies = [
  {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    icon: IndianRupee
  },
  {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    icon: DollarSign
  },
  {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    icon: Euro
  },
  {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    icon: PoundSterling
  },
  {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    icon: CircleDollarSign
  }
]

export function formatPrice(amount, currency = 'INR') {
  const currencyConfig = currencies.find(c => c.code === currency)
  if (!currencyConfig) return `${amount}`
  
  // Format based on currency
  let formattedAmount = amount
  
  switch (currency) {
    case 'INR':
      formattedAmount = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount)
      break
    case 'USD':
    case 'EUR':
    case 'GBP':
      formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount)
      break
    case 'JPY':
      formattedAmount = new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount)
      break
    default:
      formattedAmount = `${currencyConfig.symbol}${amount.toFixed(2)}`
  }
  
  return formattedAmount
}

export default function CurrencySelector({ value, onChange, className = "" }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`w-32 ${className}`}>
        <SelectValue>
          <div className="flex items-center gap-2">
            {(() => {
              const currency = currencies.find(c => c.code === value) || currencies[0]
              const Icon = currency.icon
              return (
                <>
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{currency.code}</span>
                </>
              )
            })()}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {currencies.map((currency) => {
          const Icon = currency.icon
          return (
            <SelectItem key={currency.code} value={currency.code}>
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <div className="flex flex-col">
                  <span className="font-medium">{currency.code}</span>
                  <span className="text-xs text-gray-500">{currency.name}</span>
                </div>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

export { currencies }
