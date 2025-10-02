import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './DictionarySelector.css';

/**
 * Универсальный компонент для выбора из справочников
 * @param {string} tableName - имя таблицы справочника
 * @param {array} selectedItems - массив выбранных элементов
 * @param {function} onChange - функция обратного вызова при изменении
 * @param {string} label - метка для селектора
 * @param {boolean} multiple - разрешить множественный выбор
 * @param {string} placeholder - текст placeholder
 */
const DictionarySelector = ({
  tableName,
  selectedItems = [],
  onChange,
  label,
  multiple = false,
  placeholder = 'Выберите...',
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [tableName]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('name');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error(`Ошибка загрузки ${tableName}:`, error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item) => {
    if (multiple) {
      const isSelected = selectedItems.some(selected => selected.id === item.id);
      if (isSelected) {
        onChange(selectedItems.filter(selected => selected.id !== item.id));
      } else {
        onChange([...selectedItems, item]);
      }
    } else {
      onChange(item);
      setShowDropdown(false);
      setSearchTerm('');
    }
  };

  const handleRemove = (itemId) => {
    onChange(selectedItems.filter(item => item.id !== itemId));
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSelected = (itemId) => {
    if (multiple) {
      return selectedItems.some(item => item.id === itemId);
    }
    return selectedItems?.id === itemId;
  };

  if (loading) {
    return <div className="dictionary-selector-loading">Загрузка...</div>;
  }

  return (
    <div className="dictionary-selector">
      {label && <label className="dictionary-label">{label}</label>}

      {multiple && selectedItems.length > 0 && (
        <div className="selected-items">
          {selectedItems.map(item => (
            <div key={item.id} className="selected-item-chip">
              <span>{item.name}</span>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="remove-btn"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {!multiple && selectedItems && (
        <div className="selected-single-item">
          <span>{selectedItems.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="remove-btn"
          >
            ×
          </button>
        </div>
      )}

      <div className="selector-input-container">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className="selector-input"
        />

        {showDropdown && filteredItems.length > 0 && (
          <div className="selector-dropdown">
            {filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                className={`dropdown-item ${isSelected(item.id) ? 'selected' : ''}`}
              >
                <span>{item.name}</span>
                {isSelected(item.id) && <span className="check-mark">✓</span>}
                {item.description && (
                  <small className="item-description">{item.description}</small>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showDropdown && (
        <div
          className="selector-overlay"
          onClick={() => {
            setShowDropdown(false);
            setSearchTerm('');
          }}
        />
      )}
    </div>
  );
};

export default DictionarySelector;
