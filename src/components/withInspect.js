import React from 'react';
import { View } from 'react-native';
import InspectOverlay from './InspectOverlay';

export default function withInspect(WrappedComponent) {
  if (!__DEV__) return WrappedComponent;

  function InspectableWrapper(props) {
    return (
      <View style={{ flex: 1 }}>
        <WrappedComponent {...props} />
        <InspectOverlay />
      </View>
    );
  }

  InspectableWrapper.displayName = `Inspect(${WrappedComponent.name || 'Component'})`;
  return InspectableWrapper;
}