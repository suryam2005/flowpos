import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { generateProductTags, getSuggestedTags, isValidTag, formatTag } from '../utils/tagGenerator';

const TagInput = ({ 
  tags = [], 
  onTagsChange, 
  productName = '', 
  businessType = 'restaurant',
  placeholder = 'Add tags...',
  maxTags = 10 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  const handleInputChange = (text) => {
    setInputValue(text);
    
    if (text.length >= 2) {
      const newSuggestions = getSuggestedTags(text, tags);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const addTag = (tag) => {
    const formattedTag = formatTag(tag);
    
    if (!isValidTag(formattedTag) || tags.includes(formattedTag) || tags.length >= maxTags) {
      return;
    }

    const newTags = [...tags, formattedTag];
    onTagsChange(newTags);
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    onTagsChange(newTags);
  };

  const handleInputSubmit = () => {
    if (inputValue.trim()) {
      addTag(inputValue.trim());
    }
  };

  const generateAutoTags = () => {
    const autoTags = generateProductTags(productName, businessType, []);
    const newTags = [...new Set([...tags, ...autoTags])].slice(0, maxTags);
    onTagsChange(newTags);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Product Tags</Text>
        <TouchableOpacity 
          style={styles.autoGenerateButton}
          onPress={generateAutoTags}
          activeOpacity={0.7}
        >
          <Text style={styles.autoGenerateText}>✨ Auto Generate</Text>
        </TouchableOpacity>
      </View>

      {/* Current Tags */}
      {tags.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tagsContainer}
          contentContainerStyle={styles.tagsContent}
        >
          {tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
              <TouchableOpacity
                style={styles.removeTagButton}
                onPress={() => removeTag(tag)}
                activeOpacity={0.7}
              >
                <Text style={styles.removeTagText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          value={inputValue}
          onChangeText={handleInputChange}
          onSubmitEditing={handleInputSubmit}
          returnKeyType="done"
          maxLength={20}
        />
        {inputValue.length > 0 && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleInputSubmit}
            activeOpacity={0.7}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsLabel}>Suggestions:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsContent}
          >
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestion}
                onPress={() => addTag(suggestion)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Helper Text */}
      <Text style={styles.helperText}>
        {tags.length}/{maxTags} tags • Tags help customers find your products
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  autoGenerateButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  autoGenerateText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  tagsContainer: {
    marginBottom: 12,
  },
  tagsContent: {
    paddingRight: 16,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  tagText: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '500',
    marginRight: 4,
  },
  removeTagButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeTagText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  suggestionsContainer: {
    marginBottom: 8,
  },
  suggestionsLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  suggestionsContent: {
    paddingRight: 16,
  },
  suggestion: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  suggestionText: {
    fontSize: 12,
    color: '#374151',
  },
  helperText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});

export default TagInput;