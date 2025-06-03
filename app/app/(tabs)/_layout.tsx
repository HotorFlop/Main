import { Tabs } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: 4 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { user, loading } = useAuth();

  const [fontsLoaded] = useFonts({
    Mandali: require("../../assets/fonts/Mandali-Regular.ttf"),
  });

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (!fontsLoaded || loading) {
    return null;
  }

  // Only render tabs if user is authenticated
  if (user) {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#000",
          tabBarInactiveTintColor: "#666",
          tabBarStyle: {
            backgroundColor: "#fff",
            paddingBottom: 12,
          },
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontFamily: "Mandali",
            fontSize: 12,
            marginTop: 4,
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="feed"
          options={{
            title: "Feed",
            tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="create-post"
          options={{
            title: "Create Post",
            tabBarIcon: ({ color }) => <TabBarIcon name="plus-square" color={color} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: "Messages",
            tabBarIcon: ({ color }) => <TabBarIcon name="comments" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => <TabBarIcon name="user-circle" color={color} />,
          }}
        />
      </Tabs>
    );
  }

  return null;
}
