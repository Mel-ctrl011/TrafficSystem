
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

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
};

const APP_VERSION = "1.0.0";

type InfoItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

function InfoItem({
  icon,
  title,
  description,
}: InfoItemProps) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}

export default function AboutScreen({ navigation }: any) {
  const openHelp = () => {
    navigation.navigate("Help");
  };

  const openPrivacy = () => {
    navigation.navigate("Privacy");
  };

  const showTerms = () => {
    Alert.alert(
      "Terms and conditions",
      "The official terms and conditions will be made available here."
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand section */}
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <Ionicons
              name="car-sport"
              size={43}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.brandName}>
            TrafficConnect SA
          </Text>

          <Text style={styles.tagline}>
            Connecting citizens to traffic services.
          </Text>

          <View style={styles.versionBadge}>
            <Ionicons
              name="checkmark-circle-outline"
              size={14}
              color="#FFFFFF"
            />

            <Text style={styles.versionText}>
              Version {APP_VERSION}
            </Text>
          </View>
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>
          About the platform
        </Text>

        <View style={styles.card}>
          <Text style={styles.paragraph}>
            TrafficConnect SA is a digital traffic-services
            platform designed to provide citizens with a
            convenient way to access traffic-related services
            through one application.
          </Text>

          <Text style={styles.paragraph}>
            The platform brings together essential services
            relating to driver licences, vehicle licensing,
            traffic fines, payments, appointments and
            applications.
          </Text>

          <Text style={styles.paragraph}>
            Our aim is to simplify access to these services,
            improve convenience and provide a more connected
            digital experience for citizens.
          </Text>
        </View>

        {/* Services */}
        <Text style={styles.sectionTitle}>
          Services available on the platform
        </Text>

        <View style={styles.card}>
          <InfoItem
            icon="card-outline"
            title="Traffic fines and payments"
            description="Access fine information, payment options and payment history."
          />

          <View style={styles.divider} />

          <InfoItem
            icon="id-card-outline"
            title="Driver licensing"
            description="Access driver licence information, renewals and digital licence services."
          />

          <View style={styles.divider} />

          <InfoItem
            icon="car-outline"
            title="Vehicle services"
            description="Access vehicle information, registration and licensing services."
          />

          <View style={styles.divider} />

          <InfoItem
            icon="calendar-outline"
            title="Appointments"
            description="Book and manage appointments for supported services."
          />

          <View style={styles.divider} />

          <InfoItem
            icon="document-text-outline"
            title="Applications"
            description="Submit and track supported service applications."
          />
        </View>

        {/* Mission */}
        <Text style={styles.sectionTitle}>
          Our purpose
        </Text>

        <View style={styles.missionCard}>
          <Ionicons
            name="navigate-circle-outline"
            size={32}
            color={COLORS.primary}
          />

          <Text style={styles.missionTitle}>
            Making traffic services more accessible
          </Text>

          <Text style={styles.missionDescription}>
            We aim to create a more convenient digital
            environment where citizens can access important
            traffic-related services with greater ease.
          </Text>
        </View>

        {/* Information and policies */}
        <Text style={styles.sectionTitle}>
          More information
        </Text>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={openPrivacy}
            activeOpacity={0.75}
          >
            <View style={styles.menuIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>
                Security and privacy
              </Text>
              <Text style={styles.menuDescription}>
                Learn about account security and privacy.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color="#9AA3AD"
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={showTerms}
            activeOpacity={0.75}
          >
            <View style={styles.menuIcon}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>
                Terms and conditions
              </Text>
              <Text style={styles.menuDescription}>
                View the platform's terms of use.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color="#9AA3AD"
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={openHelp}
            activeOpacity={0.75}
          >
            <View style={styles.menuIcon}>
              <Ionicons
                name="help-circle-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>
                Help and support
              </Text>
              <Text style={styles.menuDescription}>
                Get assistance using TrafficConnect SA.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color="#9AA3AD"
            />
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons
            name="information-circle-outline"
            size={19}
            color={COLORS.primary}
          />

          <Text style={styles.disclaimerText}>
            TrafficConnect SA is a digital service platform.
            Availability of individual services depends on
            their implementation and integration with the
            relevant service providers. Do not assume that
            an application or payment is officially processed
            until confirmation is provided.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>
            TRAFFICCONNECT SA
          </Text>

          <Text style={styles.footerText}>
            Connecting citizens. Simplifying services.
          </Text>

          <Text style={styles.copyright}>
            © {new Date().getFullYear()} TrafficConnect SA
          </Text>
        </View>
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
    paddingBottom: 35,
  },

  hero: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    padding: 25,
    alignItems: "center",
    marginBottom: 26,
  },

  logoContainer: {
    width: 82,
    height: 82,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  brandName: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
    textAlign: "center",
  },

  tagline: {
    color: "#DCE8F5",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },

  versionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 17,
  },

  versionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
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
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 16,
    marginBottom: 23,
  },

  paragraph: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 13,
  },

  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },

  infoIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  infoDescription: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  divider: {
    height: 1,
    backgroundColor: "#EEF1F5",
  },

  missionCard: {
    backgroundColor: COLORS.softBlue,
    borderRadius: 17,
    padding: 19,
    marginBottom: 24,
  },

  missionTitle: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 11,
  },

  missionDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
  },

  menuCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    paddingHorizontal: 14,
    marginBottom: 20,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },

  menuIcon: {
    width: 41,
    height: 41,
    borderRadius: 12,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  menuContent: {
    flex: 1,
  },

  menuTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  menuDescription: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
  },

  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.softBlue,
    padding: 13,
    borderRadius: 13,
    gap: 8,
  },

  disclaimerText: {
    flex: 1,
    color: COLORS.primary,
    fontSize: 11,
    lineHeight: 18,
  },

  footer: {
    alignItems: "center",
    marginTop: 26,
  },

  footerBrand: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  footerText: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 6,
  },

  copyright: {
    color: "#9AA3AD",
    fontSize: 10,
    marginTop: 9,
  },
});
