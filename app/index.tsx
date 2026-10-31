import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { Colors } from "../constants/Colors";

export default function IndexScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace("/(auth)/login");
      } else {
        switch (user.role) {
          case "supervisor":
            router.replace("/(supervisor)");
            break;
          case "official":
          case "admin":
            router.replace("/(official)");
            break;
          case "worker":
          default:
            router.replace("/(worker)");
            break;
        }
      }
    }
  }, [user, isLoading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
});
