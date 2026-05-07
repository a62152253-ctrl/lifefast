import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { NavItem } from '../components/CommonUI';
import { Plus, X, Edit2, Bookmark, Star, Folder, Target, Calendar, BookOpen, Briefcase, Music, Gamepad2, Camera, Palette } from 'lucide-react';
import { useToast } from './ToastContext';

export interface CustomNavItem extends Omit<NavItem, 'icon'> {
  iconKey?: string;
  isCustom?: boolean;
  userId?: string;
  order?: number;
}

interface CustomNavContextType {
  customItems: CustomNavItem[];
  addCustomItem: (item: { label: string; path: string; iconKey?: string }) => void;
  removeCustomItem: (id: string) => void;
  updateCustomItem: (id: string, updates: { label?: string; path?: string; iconKey?: string; order?: number }) => void;
  reorderItems: (items: CustomNavItem[]) => void;
  isLoading: boolean;
}

const CustomNavContext = createContext<CustomNavContextType | undefined>(undefined);

// Predefined icons for custom items
export const CUSTOM_ICONS = {
  bookmark: Bookmark,
  star: Star,
  folder: Folder,
  target: Target,
  calendar: Calendar,
  book: BookOpen,
  briefcase: Briefcase,
  music: Music,
  gamepad: Gamepad2,
  camera: Camera,
  palette: Palette,
  plus: Plus,
};

export const CustomNavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customItems, setCustomItems] = useState<CustomNavItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setIsLoading(false);
      return;
    }

    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'customNav'),
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as CustomNavItem[];
        
        // Sort by order field
        items.sort((a, b) => (a.order || 0) - (b.order || 0));
        setCustomItems(items);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error loading custom nav items:', error);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const addCustomItem = async (item: { label: string; path: string; iconKey?: string }) => {
    const user = auth.currentUser;
    if (!user) {
      console.error('❌ No user authenticated - cannot add custom nav item');
      return;
    }

    try {
      console.log('🔍 Adding custom nav item:', item);
      const docRef = doc(collection(db, 'users', user.uid, 'customNav'));
      
      // Ensure we only save serializable data
      const newItem: CustomNavItem = {
        label: item.label,
        path: item.path,
        iconKey: item.iconKey || 'bookmark',
        id: docRef.id,
        isCustom: true,
        userId: user.uid,
        order: customItems.length,
      };
      
      await setDoc(docRef, newItem);
      console.log('✅ Custom nav item added successfully:', newItem);
    } catch (error) {
      console.error('❌ Error adding custom nav item:', error);
      // Show user-friendly error
      if (error instanceof Error) {
        showToast({
          type: 'error',
          message: `Nie udało się dodać elementu nawigacji: ${error.message}`,
        });
      } else {
        showToast({
          type: 'error',
          message: 'Wystąpił nieznany błąd podczas dodawania elementu nawigacji',
        });
      }
    }
  };

  const removeCustomItem = async (id: string) => {
    const user = auth.currentUser;
    if (!user) {
      console.error('❌ No user authenticated - cannot remove custom nav item');
      return;
    }

    try {
      console.log('🗑️ Removing custom nav item:', id);
      await deleteDoc(doc(db, 'users', user.uid, 'customNav', id));
      console.log('✅ Custom nav item removed successfully');
    } catch (error) {
      console.error('❌ Error removing custom nav item:', error);
      if (error instanceof Error) {
        showToast({
          type: 'error',
          message: `Nie udało się usunąć elementu nawigacji: ${error.message}`,
        });
      } else {
        showToast({
          type: 'error',
          message: 'Wystąpił nieznany błąd podczas usuwania elementu nawigacji',
        });
      }
    }
  };

  const updateCustomItem = async (id: string, updates: { label?: string; path?: string; iconKey?: string; order?: number }) => {
    const user = auth.currentUser;
    if (!user) {
      console.error('❌ No user authenticated - cannot update custom nav item');
      return;
    }

    try {
      console.log('📝 Updating custom nav item:', id, updates);
      
      // Ensure we only save serializable data
      const serializableUpdates: Partial<CustomNavItem> = {};
      if (updates.label !== undefined) serializableUpdates.label = updates.label;
      if (updates.path !== undefined) serializableUpdates.path = updates.path;
      if (updates.iconKey !== undefined) serializableUpdates.iconKey = updates.iconKey;
      if (updates.order !== undefined) serializableUpdates.order = updates.order;
      
      await updateDoc(doc(db, 'users', user.uid, 'customNav', id), serializableUpdates);
      console.log('✅ Custom nav item updated successfully');
    } catch (error) {
      console.error('❌ Error updating custom nav item:', error);
      if (error instanceof Error) {
        showToast({
          type: 'error',
          message: `Nie udało się zaktualizować elementu nawigacji: ${error.message}`,
        });
      } else {
        showToast({
          type: 'error',
          message: 'Wystąpił nieznany błąd podczas aktualizacji elementu nawigacji',
        });
      }
    }
  };

  const reorderItems = async (items: CustomNavItem[]) => {
    const user = auth.currentUser;
    if (!user) {
      console.error('❌ No user authenticated - cannot reorder custom nav items');
      return;
    }

    try {
      console.log('🔄 Reordering custom nav items:', items.map(i => ({ id: i.id, label: i.label })));
      const batch = items.map((item, index) => 
        updateDoc(doc(db, 'users', user.uid, 'customNav', item.id), { order: index })
      );
      
      await Promise.all(batch);
      console.log('✅ Custom nav items reordered successfully');
    } catch (error) {
      console.error('❌ Error reordering custom nav items:', error);
      if (error instanceof Error) {
        showToast({
          type: 'error',
          message: `Nie udało się zmienić kolejności: ${error.message}`,
        });
      } else {
        showToast({
          type: 'error',
          message: 'Wystąpił nieznany błąd podczas zmiany kolejności elementów',
        });
      }
    }
  };

  return (
    <CustomNavContext.Provider value={{
      customItems,
      addCustomItem,
      removeCustomItem,
      updateCustomItem,
      reorderItems,
      isLoading,
    }}>
      {children}
    </CustomNavContext.Provider>
  );
};

export const useCustomNav = () => {
  const context = useContext(CustomNavContext);
  if (!context) {
    throw new Error('useCustomNav must be used within a CustomNavProvider');
  }
  return context;
};
