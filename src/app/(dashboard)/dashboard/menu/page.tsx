'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronDown,
  Search,
  UtensilsCrossed,
  AlertCircle,
  Upload,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { getUserRestaurant } from '@/lib/queries';
import { useRestaurantStore } from '@/stores/restaurant-store';
import type { MenuItem, MenuModifier } from '@/types/database';

interface MenuItemForm {
  id?: string;
  name: string;
  category: string;
  price: number | '';
  description: string;
  modifiers: MenuModifier[];
  available: boolean;
}

const emptyForm: MenuItemForm = {
  name: '',
  category: '',
  price: '',
  description: '',
  modifiers: [],
  available: true,
};

const formErrors = {
  name: '',
  category: '',
  price: '',
};

export default function MenuManagementPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<MenuItemForm>(emptyForm);
  const [formFieldErrors, setFormFieldErrors] = useState(formErrors);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [modifierInput, setModifierInput] = useState({ name: '', price: '' });
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importFormat, setImportFormat] = useState<'text' | 'csv'>('text');
  const [importData, setImportData] = useState('');
  const [importReplace, setImportReplace] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; count: number; error?: string } | null>(null);

  const supabase = createClient();
  const currentRestaurant = useRestaurantStore((s) => s.currentRestaurant);
  const setCurrentRestaurant = useRestaurantStore((s) => s.setCurrentRestaurant);

  // Load restaurant and menu items
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        let restaurant = currentRestaurant;
        if (!restaurant) {
          restaurant = await getUserRestaurant(supabase);
          if (restaurant) setCurrentRestaurant(restaurant);
        }

        if (!restaurant) {
          setError('No restaurant found. Please complete onboarding first.');
          setLoading(false);
          return;
        }

        setRestaurantId(restaurant.id);

        // Fetch menu items
        const { data, error: fetchError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (fetchError) throw fetchError;

        setMenuItems((data || []) as MenuItem[]);
        setError('');
      } catch (err) {
        console.error('Error loading menu:', err);
        setError('Failed to load menu items');
      } finally {
        setLoading(false);
      }
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRestaurant?.id]);

  // Get unique categories
  const categories = ['All', ...Array.from(new Set(menuItems
    .map((item) => item.category)
    .filter((c) => c)
  )) as string[]];

  // Filter items
  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesCategory && matchesSearch;
  });

  // Handle menu import
  async function handleImport() {
    if (!importData.trim() || !restaurantId) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const res = await fetch('/api/menu/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          format: importFormat,
          data: importData,
          replace: importReplace,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setImportResult({ success: false, count: 0, error: json.error });
      } else {
        setImportResult({ success: true, count: json.imported });
        // Reload menu items
        const { data } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('category', { ascending: true })
          .order('name', { ascending: true });
        setMenuItems((data || []) as MenuItem[]);
        setImportData('');
      }
    } catch {
      setImportResult({ success: false, count: 0, error: 'Network error' });
    }
    setImportLoading(false);
  }

  // Validate form
  const validateForm = (): boolean => {
    const errors = { name: '', category: '', price: '' };
    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = 'Item name is required';
      isValid = false;
    }

    if (formData.price === '' || Number(formData.price) <= 0) {
      errors.price = 'Price must be greater than 0';
      isValid = false;
    }

    setFormFieldErrors(errors);
    return isValid;
  };

  // Save menu item
  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaveLoading(true);
      const itemData = {
        restaurant_id: restaurantId,
        name: formData.name.trim(),
        category: formData.category.trim() || null,
        price: Number(formData.price),
        description: formData.description.trim() || null,
        modifiers: formData.modifiers.length > 0 ? formData.modifiers : null,
        available: formData.available,
      };

      if (formData.id) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', formData.id);

        if (error) throw error;

        setMenuItems((prev) =>
          prev.map((item) =>
            item.id === formData.id
              ? { ...item, ...itemData }
              : item
          )
        );
      } else {
        // Create new item
        const { data, error } = await supabase
          .from('menu_items')
          .insert([itemData])
          .select();

        if (error) throw error;

        if (data && data[0]) {
          setMenuItems((prev) => [...prev, data[0] as MenuItem]);
        }
      }

      setShowModal(false);
      setFormData(emptyForm);
      setFormFieldErrors(formErrors);
    } catch (err) {
      console.error('Error saving item:', err);
      setError('Failed to save menu item');
    } finally {
      setSaveLoading(false);
    }
  };

  // Delete menu item
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMenuItems((prev) => prev.filter((item) => item.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete menu item');
    }
  };

  // Toggle item availability
  const handleToggleAvailable = async (id: string, currentAvailable: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ available: !currentAvailable })
        .eq('id', id);

      if (error) throw error;

      setMenuItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, available: !currentAvailable } : item
        )
      );
    } catch (err) {
      console.error('Error updating availability:', err);
      setError('Failed to update item availability');
    }
  };

  // Open modal for editing
  const handleEditItem = (item: MenuItem) => {
    setFormData({
      id: item.id,
      name: item.name,
      category: item.category || '',
      price: item.price,
      description: item.description || '',
      modifiers: item.modifiers || [],
      available: item.available,
    });
    setShowModal(true);
  };

  // Add modifier
  const handleAddModifier = () => {
    if (!modifierInput.name.trim() || modifierInput.price === '') return;

    const newModifier: MenuModifier = {
      name: modifierInput.name.trim(),
      price: Number(modifierInput.price),
    };

    setFormData((prev) => ({
      ...prev,
      modifiers: [...prev.modifiers, newModifier],
    }));

    setModifierInput({ name: '', price: '' });
  };

  // Remove modifier
  const handleRemoveModifier = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      modifiers: prev.modifiers.filter((_, i) => i !== index),
    }));
  };

  // Close modal and reset form
  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(emptyForm);
    setFormFieldErrors(formErrors);
    setModifierInput({ name: '', price: '' });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-ringo-border/30 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-ringo-border/30 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !restaurantId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-bone/50 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-bone" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Error</h2>
          <p className="text-sm text-ringo-muted max-w-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Menu Management</h1>
            <span className="inline-flex items-center rounded-full bg-ringo-border/30 px-2.5 py-1 text-xs font-semibold text-ringo-muted">
              {filteredItems.length}
            </span>
          </div>
          <p className="text-sm text-ringo-muted">Manage your restaurant menu and item details</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => { setShowImport(true); setImportResult(null); }}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Import Menu
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setFormData(emptyForm);
              setFormFieldErrors(formErrors);
              setShowModal(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ringo-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-smoke bg-coal px-4 py-2.5 pl-10 text-sm text-bone placeholder:text-ash/60 transition-colors focus:outline-none focus:ring-2 focus:ring-bone/30 focus:border-bone/40"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 -mx-4 sm:mx-0 px-4 sm:px-0">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                selectedCategory === category
                  ? 'bg-bone text-obsidian'
                  : 'bg-coal border border-smoke text-bone hover:border-bone/30'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-smoke bg-graphite p-4">
          <AlertCircle className="h-5 w-5 text-bone flex-shrink-0" />
          <p className="text-sm text-bone">{error}</p>
          <button
            onClick={() => setError('')}
            className="ml-auto text-bone hover:text-bone transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Menu Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-smoke bg-coal p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-graphite flex items-center justify-center mb-4">
            <UtensilsCrossed className="h-8 w-8 text-bone" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No menu items yet</h3>
          <p className="text-sm text-ringo-muted mb-6 max-w-sm mx-auto">
            Add your first menu item to get started. Your Retell AI agent will use these items during phone calls to take orders.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setFormData(emptyForm);
              setFormFieldErrors(formErrors);
              setShowModal(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Your First Item
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} hover className="flex flex-col">
              {/* Item Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground line-clamp-2">{item.name}</h3>
                  {item.category && (
                    <Badge variant="default" className="mt-2">
                      {item.category}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="text-lg font-bold text-bone mb-2">
                ${Number(item.price).toFixed(2)}
              </div>

              {/* Description */}
              {item.description && (
                <p className="text-sm text-ringo-muted mb-3 line-clamp-2">
                  {item.description}
                </p>
              )}

              {/* Modifiers */}
              {item.modifiers && item.modifiers.length > 0 && (
                <div className="mb-3 text-xs text-ringo-muted">
                  {item.modifiers.length} modifier{item.modifiers.length !== 1 ? 's' : ''}
                </div>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Footer */}
              <div className="space-y-3 pt-3 border-t border-ringo-border">
                {/* Availability Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ringo-muted">Available</span>
                  <button
                    onClick={() => handleToggleAvailable(item.id, item.available)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      item.available ? 'bg-bone' : 'bg-smoke'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-obsidian transition-transform ${
                        item.available ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEditItem(item)}
                    className="flex-1 gap-2"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="flex-1 gap-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-obsidian/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-ringo-card border border-ringo-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-bone" />
                Import Menu
              </h2>
              <button onClick={() => setShowImport(false)} className="p-1 rounded-lg hover:bg-ringo-border/30 transition-colors">
                <X className="h-5 w-5 text-ringo-muted" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setImportFormat('text')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  importFormat === 'text' ? 'bg-bone text-obsidian' : 'bg-smoke/40 text-ash hover:text-bone'
                }`}
              >
                Paste Text
              </button>
              <button
                onClick={() => setImportFormat('csv')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  importFormat === 'csv' ? 'bg-bone text-obsidian' : 'bg-smoke/40 text-ash hover:text-bone'
                }`}
              >
                CSV
              </button>
            </div>

            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              rows={10}
              placeholder={importFormat === 'text'
                ? "Paste your menu here...\n\nBurritos\nCarne Asada Burrito - $12.99\nChicken Burrito - $10.99\n\nTacos\nStreet Taco - $3.50\nFish Taco - $4.25"
                : "name,category,price,description\nCarne Asada Burrito,Burritos,12.99,Grilled steak with rice and beans\nChicken Burrito,Burritos,10.99,Grilled chicken with rice and beans"
              }
              className="w-full rounded-lg border border-smoke bg-coal px-3 py-2.5 text-sm text-bone placeholder:text-ash/60 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-bone/30 focus:border-bone/40"
            />

            <label className="flex items-center gap-2 text-sm text-ringo-muted cursor-pointer">
              <input
                type="checkbox"
                checked={importReplace}
                onChange={(e) => setImportReplace(e.target.checked)}
                className="rounded border-ringo-border"
              />
              Replace existing menu (delete all current items first)
            </label>

            {importResult && (
              <div className={`rounded-lg px-3 py-2 text-sm ${
                importResult.success
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {importResult.success ? (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Imported {importResult.count} items successfully
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    {importResult.error}
                  </span>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="md" onClick={() => setShowImport(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleImport}
                disabled={importLoading || !importData.trim()}
                className="gap-2"
              >
                {importLoading ? 'Importing...' : 'Import'}
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-obsidian/50 backdrop-blur-sm p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl my-auto">
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between mb-6 pb-4 border-b border-ringo-border bg-ringo-card">
              <h2 className="text-xl font-bold text-foreground">
                {formData.id ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-ringo-border/30 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-ringo-muted" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-5 px-6 sm:px-6">
              {/* Item Name */}
              <div>
                <label className="block text-sm font-medium text-ringo-muted mb-1.5">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Classic Pepperoni"
                  className={`w-full rounded-lg border bg-coal px-4 py-2.5 text-sm text-bone placeholder:text-ash/60 transition-colors focus:outline-none focus:ring-2 focus:ring-bone/30 ${
                    formFieldErrors.name ? 'border-bone/70' : 'border-smoke focus:border-bone/40'
                  }`}
                />
                {formFieldErrors.name && (
                  <p className="text-xs text-bone mt-1">{formFieldErrors.name}</p>
                )}
              </div>

              {/* Category and Price Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-ringo-muted mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Pizza"
                    list="categories-list"
                    className="w-full rounded-lg border border-smoke bg-coal px-4 py-2.5 text-sm text-bone placeholder:text-ash/60 transition-colors focus:outline-none focus:ring-2 focus:ring-bone/30 focus:border-bone/40"
                  />
                  <datalist id="categories-list">
                    {categories
                      .filter((c) => c !== 'All')
                      .map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                  </datalist>
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-ringo-muted mb-1.5">
                    Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ringo-muted">
                      $
                    </span>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value ? Number(e.target.value) : '' })}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className={`w-full rounded-lg border bg-coal px-4 py-2.5 pl-8 text-sm text-bone placeholder:text-ash/60 transition-colors focus:outline-none focus:ring-2 focus:ring-bone/30 ${
                        formFieldErrors.price ? 'border-bone/70' : 'border-smoke focus:border-bone/40'
                      }`}
                    />
                  </div>
                  {formFieldErrors.price && (
                    <p className="text-xs text-bone mt-1">{formFieldErrors.price}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-ringo-muted mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your item..."
                  rows={3}
                  className="w-full rounded-lg border border-smoke bg-coal px-4 py-2.5 text-sm text-bone placeholder:text-ash/60 transition-colors focus:outline-none focus:ring-2 focus:ring-bone/30 focus:border-bone/40 resize-none"
                />
              </div>

              {/* Modifiers Section */}
              <div>
                <label className="block text-sm font-medium text-ringo-muted mb-3">
                  Modifiers (e.g., Toppings, Sizes)
                </label>

                {/* Modifier List */}
                {formData.modifiers.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {formData.modifiers.map((modifier, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-3 rounded-lg bg-ringo-border/10 p-3"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{modifier.name}</p>
                          <p className="text-xs text-ringo-muted">
                            +${Number(modifier.price).toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveModifier(index)}
                          className="p-1.5 hover:bg-ringo-border/50 rounded-lg transition-colors text-ringo-muted hover:text-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Modifier Form */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={modifierInput.name}
                    onChange={(e) => setModifierInput({ ...modifierInput, name: e.target.value })}
                    placeholder="Modifier name"
                    className="flex-1 rounded-lg border border-smoke bg-coal px-3 py-2 text-sm text-bone placeholder:text-ash/60 transition-colors focus:outline-none focus:ring-2 focus:ring-bone/30 focus:border-bone/40"
                  />
                  <input
                    type="number"
                    value={modifierInput.price}
                    onChange={(e) => setModifierInput({ ...modifierInput, price: e.target.value })}
                    placeholder="Price"
                    step="0.01"
                    min="0"
                    className="w-24 rounded-lg border border-smoke bg-coal px-3 py-2 text-sm text-bone placeholder:text-ash/60 transition-colors focus:outline-none focus:ring-2 focus:ring-bone/30 focus:border-bone/40"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAddModifier}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Available Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-ringo-border/10">
                <div>
                  <p className="text-sm font-medium text-foreground">Item Available</p>
                  <p className="text-xs text-ringo-muted">
                    {formData.available ? 'This item is available for orders' : 'This item is not available'}
                  </p>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, available: !formData.available })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.available ? 'bg-bone' : 'bg-smoke'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-obsidian transition-transform ${
                      formData.available ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 mt-8 pt-6 px-6 sm:px-6 border-t border-ringo-border">
              <Button
                variant="secondary"
                size="md"
                onClick={handleCloseModal}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSave}
                loading={saveLoading}
                className="flex-1"
              >
                {formData.id ? 'Update Item' : 'Add Item'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm rounded-2xl">
            <div className="mb-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-bone/50 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-bone" />
              </div>
              <h2 className="text-lg font-bold text-foreground text-center mb-2">Delete Item?</h2>
              <p className="text-sm text-ringo-muted text-center">
                This action cannot be undone. The menu item will be permanently deleted.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
