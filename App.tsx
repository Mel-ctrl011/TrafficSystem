import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { SafeAreaProvider } from "react-native-safe-area-context";


export default function App() {
  return (
    <SafeAreaProvider>
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
    </SafeAreaProvider>
  );
}