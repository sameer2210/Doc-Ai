import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

type TabIconProps = {
  focused: boolean;
  name: keyof typeof Ionicons.glyphMap;
};

function TabIcon({ focused, name }: TabIconProps) {
  const scale = useSharedValue(focused ? 1 : 0.94);

  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.94, { damping: 16, stiffness: 280 });
  }, [focused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, animatedStyle]}>
      <View
        style={{
          height: 34,
          minWidth: 34,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 8,
          backgroundColor: focused ? 'rgba(113, 170, 255, 0.2)' : 'transparent',
        }}
      >
        <Ionicons name={name} size={19} color={focused ? '#DDEBFF' : '#8093B6'} />
      </View>
    </Animated.View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#DDEBFF',
        tabBarInactiveTintColor: '#8093B6',
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 14,
          height: 72,
          borderRadius: 24,
          borderTopWidth: 0,
          paddingTop: 9,
          paddingBottom: 10,
          backgroundColor: 'rgba(10, 16, 27, 0.9)',
          borderWidth: 1,
          borderColor: 'rgba(178, 198, 236, 0.24)',
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={30}
            tint="dark"
            style={{
              flex: 1,
              borderRadius: 24,
              overflow: 'hidden',
            }}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="home-outline" />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'AI Chat',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="chatbubble-ellipses-outline" />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="document-text-outline" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="person-outline" />,
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
