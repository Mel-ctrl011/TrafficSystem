
import React, { useCallback, useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import VerifyAccountScreen from "../auth/SignupScreen";
import RegisteredDeviceScreen from "../components/RegisteredDeviceScreen";

import { getDeviceInfo } from "../utils/device";
import { findRegisteredDevice } from "../services/authService";

export default function DeviceGateScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [checkingError, setCheckingError] = useState("");
  const [registeredAccount, setRegisteredAccount] = useState<any>(null);

  const checkDevice = useCallback(async () => {
    setLoading(true);
    setCheckingError("");

    try {
      const device = await getDeviceInfo();

      const result = await findRegisteredDevice(device);

      if (!result.success) {
        throw new Error(
          result.message || "Unable to check this device."
        );
      }

      if (result.found) {
        setRegisteredAccount({
          ...result,
          device,
        });
      } else {
        setRegisteredAccount(null);
      }
    } catch (error: any) {
      console.log("Device recognition error:", error);

      setCheckingError(
        error?.message ||
          "We could not check your device registration."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkDevice();
  }, [checkDevice]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0B4F8A" />
        <Text style={styles.loadingTitle}>
          Checking Your Device
        </Text>
        <Text style={styles.loadingDescription}>
          Please wait while we check your TrafficConnect registration.
        </Text>
      </SafeAreaView>
    );
  }

  // If Firebase could not be checked, do not show registration.
  // Otherwise an existing user could be encouraged to register again.
  if (checkingError) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons
          name="cloud-offline-outline"
          size={45}
          color="#B42318"
        />

        <Text style={styles.errorTitle}>
          Unable to Check Your Device
        </Text>

        <Text style={styles.errorDescription}>
          We couldn't confirm whether this phone is registered.
          Check your internet connection and try again.
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={checkDevice}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (registeredAccount) {
    return (
      <RegisteredDeviceScreen
        userId={registeredAccount.userId}
        fullName={registeredAccount.fullName}
        device={registeredAccount.device}
        onContinue={() => navigation.replace("Login")}
      />
    );
  }

  return <VerifyAccountScreen navigation={navigation} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F3F5F7",
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: "800",
    color: "#17212B",
  },
  loadingDescription: {
    marginTop: 7,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    color: "#66737F",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#F3F5F7",
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },
  errorTitle: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: "800",
    color: "#17212B",
  },
  errorDescription: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 19,
    color: "#66737F",
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 30,
    paddingVertical: 13,
    backgroundColor: "#0B4F8A",
    borderRadius: 9,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
