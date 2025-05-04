import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="get-started"
        options={{
          title: "Get Started",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="continue"
        options={{
          title: "Continue With",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="signup"
        options={{
          title: "Sign Up",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          title: "Log In",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
