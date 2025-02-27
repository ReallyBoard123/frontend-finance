import { useState } from 'react';

export function useSelectionState(initialSelected: string[] = []) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(initialSelected));

  const toggleSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = (items: { id: string }[]) => {
    setSelectedItems(new Set(items.map(item => item.id)));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const isSelected = (itemId: string) => selectedItems.has(itemId);

  const selectedCount = selectedItems.size;

  return {
    selectedItems,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    selectedCount
  };
}