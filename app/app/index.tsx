import { Redirect } from "expo-router";

export default function Index() {
  const isFirstTime = true;

  return (
    <Redirect href={isFirstTime ? "/(auth)/get-started" : "/(tabs)/feed"} />
  );
}
