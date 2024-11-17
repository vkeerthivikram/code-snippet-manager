import React from 'react';
import Select from 'react-select';
import { components } from 'react-select';
import CreatableSelect from 'react-select/creatable';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

interface Option {
  label: string;
  value: string;
}

const TagInput: React.FC<TagInputProps> = ({ value, onChange, suggestions = [] }) => {
  const options: Option[] = suggestions.map(tag => ({
    label: tag,
    value: tag
  }));

  const selectedOptions: Option[] = value.map(tag => ({
    label: tag,
    value: tag
  }));

  const handleChange = (newValue: readonly Option[]) => {
    onChange(newValue.map(option => option.value));
  };

  return (
    <CreatableSelect
      isMulti
      options={options}
      value={selectedOptions}
      onChange={(newValue) => handleChange(newValue as Option[])}
      placeholder="Add tags..."
      className="tag-input"
      classNamePrefix="tag-input"
    />
  );
};

export default TagInput;
