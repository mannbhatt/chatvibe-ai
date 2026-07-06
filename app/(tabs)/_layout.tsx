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
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#5D5FEF', // Our new primary purple
      tabBarInactiveTintColor: '#8E8E93',
      tabBarShowLabel: true,
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      tabBarButton: (props) => <Pressable {...props as any} android_ripple={{ color: 'transparent' }} style={props.style} />,
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        height: 60 + insets.bottom,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        paddingTop: 8,
      },
      headerShown: false,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ color, focused }) => (
            <View className={`w-10 h-10 rounded-full items-center justify-center ${focused ? 'bg-[#EAE4FE]' : 'bg-gray-100'}`}>
              <Feather name="plus" size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <Feather name="message-square" size={24} color={color} />,
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
        name="saved"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="dev-components"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
