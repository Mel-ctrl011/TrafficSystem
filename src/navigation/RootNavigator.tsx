
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";

import { useAuth } from "../context/AuthContext";

export default function RootNavigator() {
  const { isLoggedIn, loading } = useAuth();

  // Wait until the saved session has been checked.
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003366" />
        <Text style={styles.loadingText}>Loading your account...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isLoggedIn ? (
        <MainNavigator />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F6F8",
  },
  loadingText: {
    color: "#52616F",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 14,
  },
});
