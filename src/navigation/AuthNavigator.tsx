
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import DeviceGateScreen from "../screens/DeviceGateScreen";
import LoginScreen from "../auth/LoginScreen";
import ForgotPasswordScreen from "../auth/ForgotPasswordScreen";

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="DeviceGate"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="DeviceGate"
        component={DeviceGateScreen}
      />

      <Stack.Screen
        name="Login"
        component={LoginScreen}
      />

      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
      />
    </Stack.Navigator>
  );
}
