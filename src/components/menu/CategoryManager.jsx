import { useState, useEffect } from 'react'
import { Plus, X, Edit2, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Load categories from localStorage
const loadCategories = () => {
  try {
    const saved = localStorage.getItem('menuCategories')
    return saved ? JSON.parse(saved) : ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Appetizers', 'Soups', 'Salads']
  } catch (error) {
    console.error('Error loading categories:', error)
    return ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Appetizers', 'Soups', 'Salads']
  }
}

// Save categories to localStorage
const saveCategories = (categories) => {
  try {
    localStorage.setItem('menuCategories', JSON.stringify(categories))
  } catch (error) {
    console.error('Error saving categories:', error)
  }
}

export default function CategoryManager({ onCategoriesChange }) {
  const [categories, setCategories] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [editingCategory, setEditingCategory] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const loaded = loadCategories()
    setCategories(loaded)
    if (onCategoriesChange) onCategoriesChange(loaded)
  }, [])

  const addCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const updated = [...categories, newCategory.trim()]
      setCategories(updated)
      saveCategories(updated)
      if (onCategoriesChange) onCategoriesChange(updated)
      setNewCategory('')
    }
  }

  const deleteCategory = (category) => {
    if (confirm(`Are you sure you want to delete "${category}"? Items in this category will need to be reassigned.`)) {
      const updated = categories.filter(cat => cat !== category)
      setCategories(updated)
      saveCategories(updated)
      if (onCategoriesChange) onCategoriesChange(updated)
    }
  }

  const startEdit = (category) => {
    setEditingCategory(category)
    setEditValue(category)
  }

  const saveEdit = () => {
    if (editValue.trim() && editValue.trim() !== editingCategory) {
      const updated = categories.map(cat => cat === editingCategory ? editValue.trim() : cat)
      setCategories(updated)
      saveCategories(updated)
      if (onCategoriesChange) onCategoriesChange(updated)
    }
    setEditingCategory(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingCategory(null)
    setEditValue('')
  }

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Edit2 className="w-4 h-4 mr-2" />
            Manage Categories
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Menu Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add New Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add New Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter category name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                  />
                  <Button onClick={addCategory}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Categories List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Categories ({categories.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category} className="flex items-center justify-between p-2 border rounded-lg">
                      {editingCategory === category ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1"
                          />
                          <Button size="sm" onClick={saveEdit}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Badge variant="secondary" className="text-sm">
                            {category}
                          </Badge>
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEdit(category)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit category</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteCategory(category)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete category</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
