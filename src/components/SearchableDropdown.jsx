import React, { useState, useRef, useEffect, memo } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useDebounce } from '../utils/hooks';
import './SearchableDropdown.css';

const SearchableDropdownComponent = ({ 
  options = [], 
  value = '', 
  onChange, 
  placeholder = 'Select...', 
  className = '',
  icon: Icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Debounce search term for better performance (300ms delay)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Debug logging
  useEffect(() => {
  }, [options, value, placeholder, className]);

  // Filter options based on debounced search term
  useEffect(() => {
    if (debouncedSearchTerm) {
      const filtered = options.filter(option =>
        option.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [debouncedSearchTerm, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
    }
  };

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  const displayValue = value !== undefined && value !== null && value !== '' ? value : placeholder;

  return (
    <div className={`searchable-dropdown ${className}`} ref={dropdownRef}>
      <div className="dropdown-trigger" onClick={handleToggle}>
        {Icon && <Icon className="dropdown-icon" />}
        <span className={`dropdown-value ${value !== undefined && value !== null && value !== '' ? '' : 'placeholder'}`}>
          {displayValue}
        </span>
        <div className="dropdown-actions">
          {value !== undefined && value !== null && value !== '' && (
            <X 
              className="clear-icon" 
              onClick={handleClear}
              title="Clear selection"
            />
          )}
          <ChevronDown className={`chevron-icon ${isOpen ? 'open' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="search-container">
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`Search ${placeholder.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="options-container">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  className={`dropdown-option ${value !== undefined && value !== null && value !== '' && value === option ? 'selected' : ''}`}
                  onClick={() => handleSelect(option)}
                >
                  {option}
                </div>
              ))
            ) : (
              <div className="no-options">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
const SearchableDropdown = memo(SearchableDropdownComponent);

export default SearchableDropdown;
