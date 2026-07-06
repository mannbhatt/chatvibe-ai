import React from 'react';
import { View, Text, ScrollView } from 'react-native';

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error("ORIGINAL RENDER ERROR CAUGHT:", error);
    console.error("COMPONENT STACK:", errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: 'red', padding: 20 }}>
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 20 }}>Original Error Caught!</Text>
          <Text style={{ color: 'white', marginTop: 10 }}>{this.state.error?.toString()}</Text>
          <Text style={{ color: 'white', marginTop: 10, fontSize: 10 }}>{this.state.errorInfo?.componentStack}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}
