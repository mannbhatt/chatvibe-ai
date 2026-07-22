import React, { forwardRef } from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import ViewShot from 'react-native-view-shot';

interface MemeCanvasProps {
  imageUri: string;
  caption: string;
  width?: number;
}

const MemeCanvas = forwardRef<any, MemeCanvasProps>(({ imageUri, caption, width }, ref) => {
  const screenWidth = Dimensions.get('window').width;
  const canvasWidth = width || screenWidth - 48;
  
  const parts = caption.split('|');
  const topText = parts.length > 1 ? parts[0] : null;
  const bottomText = parts.length > 1 ? parts[1] : parts[0];

  return (
    <ViewShot ref={ref} options={{ format: 'png', quality: 0.9 }}>
      <View style={{ width: canvasWidth, height: canvasWidth, backgroundColor: 'black', overflow: 'hidden' }}>
        <Image 
          source={{ uri: imageUri }} 
          style={{ width: '100%', height: '100%', position: 'absolute' }}
          resizeMode="cover"
        />
        
        {topText && (
          <View style={[styles.textContainer, { top: 20 }]}>
            <Text style={styles.memeText} adjustsFontSizeToFit numberOfLines={2}>
              {topText.trim().toUpperCase()}
            </Text>
          </View>
        )}
        
        {bottomText && (
          <View style={[styles.textContainer, { bottom: 20 }]}>
            <Text style={styles.memeText} adjustsFontSizeToFit numberOfLines={3}>
              {bottomText.trim().toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    </ViewShot>
  );
});

const styles = StyleSheet.create({
  textContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memeText: {
    color: 'white',
    fontSize: 42,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'black',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    letterSpacing: 1,
  }
});

export default MemeCanvas;
