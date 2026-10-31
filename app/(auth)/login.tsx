import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("worker1");
  const [password, setPassword] = useState("Worker@12345");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"worker" | "supervisor" | "official" | "admin">("worker");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleRoleSelect = (role: "worker" | "supervisor" | "official" | "admin") => {
    setSelectedRole(role);
    if (role === "worker") {
      setUsername("worker1");
      setPassword("Worker@12345");
    } else if (role === "supervisor") {
      setUsername("supervisor1");
      setPassword("Supervisor@12345");
    } else if (role === "official") {
      setUsername("official1");
      setPassword("Official@12345");
    } else {
      setUsername("admin1");
      setPassword("Admin@12345");
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setErrorMessage("Please enter both username and password");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      await login(username, selectedRole);
      if (selectedRole === "supervisor") {
        router.replace("/(supervisor)");
      } else if (selectedRole === "official" || selectedRole === "admin") {
        router.replace("/(official)");
      } else {
        router.replace("/(worker)");
      }
    } catch (err: any) {
      setErrorMessage("Authentication failed. Please verify credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Brand Crest */}
        <View style={styles.brandContainer}>
          <Image
            source={require("../../assets/brand/aavin-aalumai-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>AAVIN AALUMAI</Text>
          <Text style={styles.tamilTitle}>ஆவின் ஆளுமை</Text>
          <Text style={styles.brandSubtitle}>SHIFT COUNTER LEDGER</Text>
          <Text style={styles.tagline}>
            Tamper-Evident Industrial Milk Production Monitoring
          </Text>
        </View>

        {/* Role Quick Switcher */}
        <View style={styles.roleTabs}>
          {(["worker", "supervisor", "official", "admin"] as const).map((r) => (
            <TouchableOpacity
              key={r}
              style={[
                styles.roleTab,
                selectedRole === r && styles.roleTabActive,
              ]}
              onPress={() => handleRoleSelect(r)}
            >
              <Text
                style={[
                  styles.roleTabText,
                  selectedRole === r && styles.roleTabTextActive,
                ]}
              >
                {r.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Plant Operator Sign-In</Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Employee ID / Username</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. worker1"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginBtnText}>SIGN IN TO SHIFT</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Aavin Madurai District Cooperative Milk Producers' Union</Text>
          <Text style={styles.footerSub}>VFFS Pouch Machine Tamper-Evident Ledger • v1.0.0</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 24,
    justifyContent: "center",
    minHeight: "100%",
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.secondary,
    letterSpacing: 1,
  },
  tamilTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primary,
    marginTop: 2,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.accent,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  tagline: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
  },
  roleTabs: {
    flexDirection: "row",
    backgroundColor: Colors.borderLight,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  roleTabActive: {
    backgroundColor: Colors.surface,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  roleTabText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  roleTabTextActive: {
    color: Colors.primary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.errorLight,
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginLeft: 6,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: Colors.surface,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  footer: {
    marginTop: 30,
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  footerSub: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
