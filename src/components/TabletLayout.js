import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { getTabletLayoutConfig } from '../utils/deviceUtils';

const TabletLayout = ({ children, sidebar, showSidebar = true }) => {
  const layoutConfig = getTabletLayoutConfig();
  
  if (!layoutConfig.useTabletLayout || !layoutConfig.showSidebar || !showSidebar) {
    return <View style={styles.container}>{children}</View>;
  }
  
  return (
    <View style={styles.container}>
      <View style={[styles.mainContent, { width: layoutConfig.mainContentWidth }]}>
        {children}
      </View>
      <View style={[styles.sidebar, { width: layoutConfig.sidebarWidth }]}>
        {sidebar}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  sidebar: {
    backgroundColor: '#ffffff',
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default TabletLayout;