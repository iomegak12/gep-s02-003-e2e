import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Searchbar } from 'react-native-paper';

/**
 * Debounced search input. Calls `onDebouncedChange` `delay` ms after the user stops typing.
 */
export default function SearchBar({ placeholder = 'Search…', onDebouncedChange, delay = 350 }) {
  const [value, setValue] = useState('');
  const timer = useRef(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onDebouncedChange?.(value.trim()), delay);
    return () => timer.current && clearTimeout(timer.current);
  }, [value, delay, onDebouncedChange]);

  return (
    <View style={styles.wrap}>
      <Searchbar
        placeholder={placeholder}
        value={value}
        onChangeText={setValue}
        mode="bar"
        style={styles.input}
        inputStyle={{ fontSize: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8 },
  input: { elevation: 0 },
});
