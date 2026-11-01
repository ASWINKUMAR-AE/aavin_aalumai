import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  title?: string;
  subtitle?: string;
  showLogout?: boolean;
}

export const AavinHeader: React.FC<Props> = ({
  title = "AAVIN AALUMAI",
  subtitle = "SHIFT COUNTER LEDGER",
  showLogout = true,
}) => {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) }]}>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <Image
            source={require("../../assets/brand/aavin-aalumai-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        {showLogout && (
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.metaRow}>
        <View style={styles.badge}>
          <Ionicons name="time-outline" size={14} color={Colors.secondary} />
          <Text style={styles.badgeText}>Shift 1 (Morning) • 06:00 - 14:00</Text>
        </View>

        {user && (
          <View style={[styles.roleBadge, user.role === "supervisor" && styles.supervisorBadge]}>
            <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  textContainer: {
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.secondary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.accent,
    letterSpacing: 0.8,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 4,
    fontWeight: "500",
  },
  roleBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  supervisorBadge: {
    backgroundColor: Colors.warningLight,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.secondary,
  },
});

