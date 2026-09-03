import { Tabs, Redirect } from 'expo-router';
import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { session, isLoading } = useAuth();

  if (!isLoading && !session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#cff5e1' }}>
      <Tabs screenOptions={{
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: 'rgba(0,0,0,0.4)',
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
        tabBarButton: (props) => <Pressable {...props as any} android_ripple={{ color: 'transparent' }} style={props.style} />,
        tabBarStyle: {
          backgroundColor: '#FFFFFF', // neo-green 00C49A
          borderWidth: 0,
          borderColor: '#000000',
          borderTopWidth: 2,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },

        headerShown: false,
      }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: 'History',
            tabBarIcon: ({ color }) => <Feather name="clock" size={24} color={color} />,
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} />,
          }}
        />
        {/* Hidden tabs */}
        <Tabs.Screen
          name="dev-components"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </View>
  );
}
