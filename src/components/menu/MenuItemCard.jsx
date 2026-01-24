import { Edit2, Trash2, Image as ImageIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/components/ui/currency-selector'

export default function MenuItemCard({ item, onEdit, onDelete, onToggleStock, currency = 'INR' }) {
  const typeConfig = {
    VEG: {
      label: 'VEG',
      color: 'bg-green-100 text-green-800',
      dotColor: 'bg-green-500'
    },
    NON_VEG: {
      label: 'NON-VEG',
      color: 'bg-red-100 text-red-800',
      dotColor: 'bg-red-500'
    }
  }

  const config = typeConfig[item.type]

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
      <div className="relative">
        {/* Image */}
        <div className="h-48 bg-gray-100 relative overflow-hidden">
          {item.photo ? (
            <img
              src={item.photo}
              alt={item.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-16 h-16 text-gray-300" />
            </div>
          )}
          
          {/* Stock Status Overlay */}
          {!item.isInStock && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <Badge variant="destructive" className="text-lg px-4 py-2">
                Out of Stock
              </Badge>
            </div>
          )}

          {/* Action Buttons */}
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="secondary"
              onClick={() => onEdit(item)}
              className="bg-white hover:bg-gray-100"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="destructive"
              onClick={() => onDelete(item._id)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 mb-1">{item.name}</h3>
            <div className="flex items-center gap-2">
              <Badge className={config.color}>
                <div className={`w-2 h-2 rounded-full ${config.dotColor} mr-1`}></div>
                {config.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {item.category}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{formatPrice(item.price, currency)}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{item.description}</p>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleStock(item._id, !item.isInStock)}
            className={item.isInStock ? 'text-yellow-600 border-yellow-600 hover:bg-yellow-50' : 'text-green-600 border-green-600 hover:bg-green-50'}
          >
            {item.isInStock ? 'Mark Out of Stock' : 'Mark In Stock'}
          </Button>
          
          <div className="text-xs text-gray-500">
            {new Date(item.updatedAt).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
