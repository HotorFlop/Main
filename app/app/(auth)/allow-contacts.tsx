import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Linking } from "react-native";
import * as Contacts from "expo-contacts";
import { useRouter } from "expo-router";
import { createClient } from "@supabase/supabase-js";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { useAuth } from "../../context/AuthContext";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AllowContacts() {
  const { user } = useAuth();
  const router = useRouter();
  const [contactsFetched, setContactsFetched] = useState(false);

  const fetchContacts = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") {
      return Alert.alert(
        "Permission Required",
        "Expo needs access to your contacts. Please enable access in Settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
    }

    setContactsFetched(true);

    // Fetch contacts from the device
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
    });

    // Process contacts and normalize phone numbers
    let contacts = data
      .filter((contact) => contact.phoneNumbers && contact.phoneNumbers.length > 0)
      .map((contact) => {
        // Ensure phoneNumbers is an array of objects with a `number` property
        const firstPhoneNumber = contact.phoneNumbers?.[0]?.number ?? null;

        // Parse the phone number safely
        const phoneNumber = firstPhoneNumber
          ? parsePhoneNumberFromString(firstPhoneNumber, "US")
          : null;

        console.log("this is the phone number");
        console.log(phoneNumber?.nationalNumber);

        return {
          name: contact.name,
          phone: phoneNumber?.nationalNumber,
        };
      });

    const phoneNumbers = contacts.map((c) => c.phone);

    // Check which phone numbers exist in the "User" table
    const { data: existingUsers, error } = await supabase
      .from("User")
      .select("id, phone_number, name")
      .in("phone_number", phoneNumbers);

    if (error) {
      console.error("Error fetching users:", error);
      return;
    }

    const friendsToAdd = existingUsers.map((friend) => ({
      user_id: user?.id,
      friend_id: friend.id,
    }));

    // Insert friend into database
    if (friendsToAdd.length > 0) {
      const { error: insertError } = await supabase.from("Friends").insert(friendsToAdd);
      if (insertError) {
        console.error("Error adding friends:", insertError);
        return;
      }
    }

    router.push({
      pathname: "/add-friends",
      params: { selectedUsers: JSON.stringify(contacts) },
    });

  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Next, you can allow access to your contacts</Text>
      <Text style={styles.subtitle}>
        This will make it easier to find your friends on hot or flop.
      </Text>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Your contacts will be periodically synced and stored securely on our servers so we can help recommend people and things that are relevant to you. You can turn off syncing at any time in Settings.
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={fetchContacts}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          router.push("../(tabs)/feed")
        }
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: "#FFACAC", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", color: "#FFF", textAlign: "center", marginBottom: 10 },
  subtitle: { fontSize: 16, color: "#FFF", textAlign: "center", marginBottom: 20 },
  infoContainer: { width: "100%", padding: 15, borderRadius: 8, marginBottom: 30 },
  infoText: { fontSize: 14, color: "#FFF", marginBottom: 10, textAlign: "center" },
  link: { color: "#F78119", fontWeight: "bold" },
  button: { marginTop: 20, backgroundColor: "#FFBFA9", paddingVertical: 15, borderRadius: 8, alignItems: "center", width: "100%" },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  skipText: { color: "#FFF", fontSize: 16, textDecorationLine: "underline", textAlign: "center", marginTop: 10 },
});
