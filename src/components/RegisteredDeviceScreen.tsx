
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  fullName?: string;
  userId: string;
  device?: any;
  onContinue: () => void;
}

const COLORS = {
  primary: "#0B4F8A",
  background: "#F3F5F7",
  text: "#17212B",
  muted: "#66737F",
  border: "#D9E0E6",
  success: "#18794E",
  softGreen: "#ECFDF3",
};

export default function RegisteredDeviceScreen({
  fullName,
  userId,
  device,
  onContinue,
}: Props) {
  const maskedId =
    userId.length === 13
      ? `${userId.slice(0, 6)}*******`
      : "•••••••••••••";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.logo}>
          <Ionicons
            name="shield-checkmark"
            size={34}
            color="#FFFFFF"
          />
        </View>

        <Text style={styles.brand}>TRAFFICCONNECT SA</Text>

        <View style={styles.statusIcon}>
          <Ionicons
            name="checkmark-circle"
            size={64}
            color={COLORS.success}
          />
        </View>

        <Text style={styles.title}>Your Device Is Linked</Text>

        <Text style={styles.description}>
          Welcome back{fullName ? `, ${fullName}` : ""}.
          This phone is already registered to your
          TrafficConnect citizen account.
        </Text>

        <View style={styles.detailsCard}>
          <Text style={styles.cardHeading}>
            REGISTRATION DETAILS
          </Text>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="person-outline"
                size={19}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>
                CITIZEN ID
              </Text>
              <Text style={styles.detailValue}>
                {maskedId}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="phone-portrait-outline"
                size={19}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>
                REGISTERED DEVICE
              </Text>
              <Text style={styles.detailValue}>
                {device?.model || "This phone"}
              </Text>
              <Text style={styles.detailSubtext}>
                {device?.os || "Registered installation"}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={19}
                color={COLORS.success}
              />
            </View>

            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>
                ACCOUNT STATUS
              </Text>
              <Text style={styles.activeText}>
                Active · Device linked
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={onContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            Continue to Login
          </Text>
          <Ionicons
            name="arrow-forward"
            size={19}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <Text style={styles.helpText}>
          Changed your phone or lost access to your
          registered device? Contact TrafficConnect support.
        </Text>

        <Text style={styles.footer}>
          Secure Citizen Services
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  brand: {
    textAlign: "center",
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  statusIcon: {
    alignItems: "center",
    marginTop: 34,
    marginBottom: 12,
  },
  title: {
    fontSize: 25,
    fontWeight: "900",
    color: COLORS.text,
    textAlign: "center",
  },
  description: {
    marginTop: 9,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.muted,
    textAlign: "center",
  },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    marginTop: 27,
  },
  cardHeading: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailIcon: {
    width: 39,
    height: 39,
    borderRadius: 10,
    backgroundColor: "#EAF3FA",
    alignItems: "center",
    justifyContent: "center",
  },
  detailInfo: {
    flex: 1,
    marginLeft: 11,
  },
  detailLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: COLORS.muted,
  },
  detailValue: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },
  detailSubtext: {
    marginTop: 2,
    fontSize: 10,
    color: COLORS.muted,
  },
  activeText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.success,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 13,
  },
  button: {
    height: 51,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    marginRight: 9,
  },
  helpText: {
    marginTop: 17,
    fontSize: 10,
    lineHeight: 16,
    color: COLORS.muted,
    textAlign: "center",
  },
  footer: {
    marginTop: 25,
    textAlign: "center",
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: "800",
  },
});
