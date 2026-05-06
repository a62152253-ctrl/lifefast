import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { useCustomNav, CUSTOM_ICONS } from '../context/CustomNavContext';
import { Card, Button, IconButton } from './CommonUI';
import { useLanguage } from '../context/LanguageContext';

export default function CustomNavManager() {
  const { customItems, addCustomItem, removeCustomItem, updateCustomItem } = useCustomNav();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    path: '',
    iconKey: 'bookmark',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.label || !formData.path) return;

    if (editingItem) {
      await updateCustomItem(editingItem, {
        label: formData.label,
        path: formData.path,
        iconKey: formData.iconKey,
      });
    } else {
      await addCustomItem({
        label: formData.label,
        path: formData.path,
        iconKey: formData.iconKey,
      });
    }

    setFormData({ label: '', path: '', iconKey: 'bookmark' });
    setIsOpen(false);
    setEditingItem(null);
  };

  const handleEdit = (item: any) => {
    setFormData({
      label: item.label,
      path: item.path,
      iconKey: item.iconKey || 'bookmark',
    });
    setEditingItem(item.id);
    setIsOpen(true);
  };

  return (
    <div className="relative">
      {/* Simple Plus Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[0.875rem] text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all duration-200 group"
      >
        <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-white">
          <Plus size={16} className="transition-colors" />
        </div>
        <span className="text-[13px] font-semibold leading-none">
          {t('nav.custom.add') || 'Dodaj kartę'}
        </span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 z-50"
          >
            <Card className="p-4 space-y-4 min-w-[280px]">
              {/* Existing Items */}
              {customItems.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                    {t('nav.custom.existing') || 'Twoje karty'}
                  </p>
                  <div className="space-y-2">
                    {customItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                            {(CUSTOM_ICONS[item.iconKey as keyof typeof CUSTOM_ICONS] || CUSTOM_ICONS.bookmark)({ size: 16 })}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{item.label}</p>
                            <p className="text-xs text-gray-400">{item.path}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <IconButton
                            icon={Edit2}
                            className="text-gray-400 hover:text-indigo-600"
                            onClick={() => handleEdit(item)}
                          />
                          <IconButton
                            icon={X}
                            className="text-gray-400 hover:text-red-600"
                            onClick={() => removeCustomItem(item.id)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Form */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  {editingItem ? (t('nav.custom.edit') || 'Edytuj kartę') : (t('nav.custom.new') || 'Nowa karta')}
                </p>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <input
                      type="text"
                      placeholder={t('nav.custom.label') || 'Nazwa'}
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder={t('nav.custom.path') || 'Ścieżka (np. /moja-strona)'}
                      value={formData.path}
                      onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <select
                      value={formData.iconKey}
                      onChange={(e) => setFormData({ ...formData, iconKey: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="bookmark">📖 Zakładka</option>
                      <option value="star">⭐ Gwiazda</option>
                      <option value="folder">📁 Folder</option>
                      <option value="target">🎯 Cel</option>
                      <option value="calendar">📅 Kalendarz</option>
                      <option value="book">📚 Książka</option>
                      <option value="briefcase">💼 Praca</option>
                      <option value="music">🎵 Muzyka</option>
                      <option value="gamepad">🎮 Gry</option>
                      <option value="camera">📷 Aparat</option>
                      <option value="palette">🎨 Paleta</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      {editingItem ? (t('common.save') || 'Zapisz') : (t('common.add') || 'Dodaj')}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setIsOpen(false);
                        setEditingItem(null);
                        setFormData({ label: '', path: '', iconKey: 'bookmark' });
                      }}
                    >
                      {t('common.cancel') || 'Anuluj'}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
