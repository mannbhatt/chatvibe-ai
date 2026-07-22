import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertOptions = {
  title: string;
  message: string;
  buttons?: AlertButton[];
  type?: 'error' | 'success' | 'info';
};

interface AlertContextType {
  showAlert: (title: string, message: string, buttons?: AlertButton[], type?: 'error' | 'success' | 'info') => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);

  const showAlert = (title: string, message: string, buttons?: AlertButton[], type: 'error' | 'success' | 'info' = 'info') => {
    setOptions({ title, message, buttons, type });
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
    setTimeout(() => setOptions(null), 300); // Wait for animation
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      
      <Modal visible={visible} transparent animationType="fade">
        <View className="flex-1 justify-center items-center px-6 z-50">
          <BlurView intensity={20} className="absolute inset-0 bg-black/40" />
          
          {options && (
            <View className="bg-white rounded-3xl w-full p-8 items-center border-[3px] border-black" style={{ shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0 }}>
              <View className={`w-16 h-16 rounded-[20px] items-center justify-center mb-5 border-[3px] border-black ${
                options.type === 'error' ? 'bg-[#FF4B72]' : 
                options.type === 'success' ? 'bg-neo-green' : 'bg-neo-purple'
              }`} style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
                <Feather 
                  name={options.type === 'error' ? 'alert-triangle' : options.type === 'success' ? 'check-circle' : 'info'} 
                  size={28} 
                  color={options.type === 'error' ? 'white' : 'black'} 
                />
              </View>
              
              <Text className="text-[22px] font-extrabold text-black mb-2 text-center tracking-tight leading-7">
                {options.title}
              </Text>
              
              <Text className="text-[15px] font-bold text-black/80 mb-8 text-center leading-6 px-2">
                {options.message}
              </Text>
              
              <View className={`flex-row w-full justify-center ${options.buttons && options.buttons.length > 2 ? 'flex-col' : 'space-x-3'}`}>
                {options.buttons && options.buttons.length > 0 ? (
                  options.buttons.map((btn, idx) => (
                    <TouchableOpacity 
                      key={idx}
                      onPress={() => {
                        hideAlert();
                        if (btn.onPress) btn.onPress();
                      }}
                      className={`py-4 rounded-2xl items-center justify-center border-[3px] border-black ${
                        options.buttons && options.buttons.length > 2 ? 'w-full mb-3' : 'flex-1'
                      } ${
                        btn.style === 'cancel' ? 'bg-white' : 
                        btn.style === 'destructive' ? 'bg-[#FF4B72]' : 'bg-neo-purple'
                      } ${idx > 0 && !(options.buttons && options.buttons.length > 2) ? 'ml-3' : ''}`}
                      style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}
                    >
                      <Text className={`font-extrabold text-[15px] tracking-tight ${btn.style === 'cancel' ? 'text-black' : 'text-white'}`}>
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <TouchableOpacity 
                    onPress={hideAlert}
                    className={`w-full py-4 rounded-2xl items-center justify-center border-[3px] border-black ${
                      options.type === 'error' ? 'bg-[#FF4B72]' : 
                      options.type === 'success' ? 'bg-neo-green' : 'bg-neo-purple'
                    }`}
                    style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}
                  >
                    <Text className={`font-extrabold tracking-tight text-[16px] ${options.type === 'success' ? 'text-black' : 'text-white'}`}>Got it</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlert must be used within an AlertProvider');
  return context;
};
