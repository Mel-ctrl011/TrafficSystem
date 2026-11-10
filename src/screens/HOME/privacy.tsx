
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";

const COLORS = {
  primary: "#003366",
  background: "#F4F7FB",
  card: "#FFFFFF",
  border: "#E1E7EF",
  text: "#17202A",
  muted: "#6B7280",
  softBlue: "#EAF2F8",
  softGreen: "#EAF7EF",
  success: "#2E7D32",
  amber: "#9A6700",
  softAmber: "#FFF4DF",
};

type SecurityItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  tint?: string;
  background?: string;
};

function SecurityItem({
  icon,
  title,
  description,
  tint = COLORS.primary,
  background = COLORS.softBlue,
}: SecurityItemProps) {
  return (
    <View style={styles.item}>
      <View style={[styles.itemIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={21} color={tint} />
      </View>

      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemDescription}>{description}</Text>
      </View>
    </View>
  );
}

export default function PrivacyScreen() {
  const { user } = useAuth();

  const verified = Boolean(user?.verified);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="shield-checkmark"
              size={32}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.heroTitle}>
            Your security matters
          </Text>

          <Text style={styles.heroDescription}>
            TrafficConnect SA is designed to help protect
            your account information and personal details.
          </Text>
        </View>

        {/* Account security */}
        <Text style={styles.sectionTitle}>
          Account security
        </Text>

        <View style={styles.card}>
          <SecurityItem
            icon="person-circle-outline"
            title="Account identity"
            description="Your account is linked to your registered citizen profile."
          />

          <View style={styles.divider} />

          <SecurityItem
            icon="checkmark-circle-outline"
            title="Verification status"
            description={
              verified
                ? "Your account is marked as verified."
                : "Your account is not currently marked as verified."
            }
            tint={verified ? COLORS.success : COLORS.amber}
            background={verified ? COLORS.softGreen : COLORS.softAmber}
          />

          <View style={styles.divider} />

          <SecurityItem
            icon="key-outline"
            title="Sign-in protection"
            description="Keep your sign-in credentials private. Never share your password or verification codes."
          />
        </View>

        {/* Privacy */}
        <Text style={styles.sectionTitle}>
          Privacy and personal information
        </Text>

        <View style={styles.card}>
          <SecurityItem
            icon="lock-closed-outline"
            title="Personal information"
            description="Your registered contact details and citizen information should only be accessed by authorised services."
          />

          <View style={styles.divider} />

          <SecurityItem
            icon="card-outline"
            title="Identity protection"
            description="Your ID number is masked on your profile screen to reduce unnecessary exposure."
          />

          <View style={styles.divider} />

          <SecurityItem
            icon="document-text-outline"
            title="Profile changes"
            description="Changes to your registered email or phone number require administrator review."
          />
        </View>

        {/* Device safety */}
        <Text style={styles.sectionTitle}>
          Keep your device secure
        </Text>

        <View style={styles.card}>
          <SecurityItem
            icon="phone-portrait-outline"
            title="Protect your device"
            description="Use a PIN, password or biometric screen lock on your phone."
          />

          <View style={styles.divider} />

          <SecurityItem
            icon="log-out-outline"
            title="Sign out on shared devices"
            description="Always log out when using a device that belongs to someone else."
          />

          <View style={styles.divider} />

          <SecurityItem
            icon="alert-circle-outline"
            title="Report suspicious activity"
            description="Contact TrafficConnect SA support if you notice activity you do not recognise."
          />
        </View>

        {/* Security notice */}
        <View style={styles.notice}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={COLORS.primary}
          />

          <Text style={styles.noticeText}>
            Security and privacy features depend on the
            services enabled for your account. This page
            provides guidance and does not independently
            change your account security settings.
          </Text>
        </View>

        <Text style={styles.footer}>
          TRAFFICCONNECT SA · ACCOUNT SECURITY
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  hero: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    marginBottom: 25,
  },
  heroIcon: {
    width: 65,
    height: 65,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },
  heroDescription: {
    color: "#DCE8F5",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 9,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 11,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    marginBottom: 22,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  itemIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
  itemDescription: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#EEF1F5",
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.softBlue,
    borderRadius: 13,
    padding: 13,
    gap: 9,
  },
  noticeText: {
    flex: 1,
    color: COLORS.primary,
    fontSize: 11,
    lineHeight: 18,
  },
  footer: {
    textAlign: "center",
    color: "#9AA3AD",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 24,
  },
});
