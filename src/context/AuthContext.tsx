
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { getDeviceInfo } from "../utils/device";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* =========================================================
   FINE TYPE
========================================================= */

export type CitizenFine = {
  id: string;
  ticketId: string;
  reference: string;
  email?: string;
  type: string;
  category: string;
  offence: string;
  description?: string;
  date: string;
  issuedAt?: string;
  offenceDate?: string;
  location: string;
  cameraLocation?: string;
  vehicleId: string;
  registrationNumber: string;
  recordedSpeed?: number;
  speed?: number;
  speedLimit?: number;
  amount: number;
  fineAmount?: number;
  outstandingAmount?: number;
  status: "Outstanding" | "Paid" | "Disputed";
  paymentStatus: "Unpaid" | "Paid" | "Disputed";
  dueDate: string;
  paymentReference?: string;
  paidAt?: string;
  createdAt?: string;
};

/* =========================================================
   VEHICLE TYPE
========================================================= */

export type CitizenVehicle = {
  vehicleId: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  colour: string;
  vin: string;
  engineNumber: string;

  licenceDisk: {
    number: string;
    expiryDate: string;
    status: string;
  };

  ownership: {
    owner: boolean;
    financed: boolean;
  };

  roadworthy: boolean;
  stolen: boolean;
};

/* =========================================================
   CITIZEN USER TYPE
========================================================= */

export type CitizenUser = {
 id: string;
  phone: string;
  verified: boolean;

  fullName?: string;
  email?: string;
  idNumber?: string;
  accountStatus?: string;
  biometricEnabled?: boolean;
  vehicleCount?: number;

  devices?: any;

  // New device registration fields
  registeredDeviceId?: string;

  registeredDevice?: {
    deviceId?: string;
    model?: string;
    os?: string;
    osVersion?: string;
  };

  driverLicense?: {
    number: string;
    status: string;
    expiryDate: string;
    issueDate: string;
    class: string;
    cardNumber: string;
  };

  digitalLicense?: {
    enabled: boolean;
    qrToken: string;
    lastGenerated: string;
  };

  collection?: {
    productionStatus: string;
    readyForCollection: boolean;
    location: string;
  };

  ownership?: {
    verified: boolean;
  };

  profilePhoto?: string;
  signaturePhoto?: string;
  gender?: string;
  birthDate?: string;

  address?: {
    street: string;
    suburb: string;
    city: string;
    province: string;
    postalCode: string;
  };

  licenceHistory?: {
    type: string;
    date: string;
    office: string;
    licenseStatus?: boolean;
  }[];

  vehicles?: CitizenVehicle[];
  fines?: CitizenFine[];
  notifications?: any[];
  emergencyContacts?: any[];

  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };

  preferences?: {
    biometricLogin: boolean;
    darkMode: boolean;
    notifications: boolean;
  };

  medical?: {
    conditions: string;
    organDonor: boolean;
  };

  renewal?: {
    status: string;
    submittedAt: string;
    collectionCentre: string;
  };
};

/* =========================================================
   AUTH CONTEXT TYPE
========================================================= */

type AuthContextType = {
  user: CitizenUser | null;
  loading: boolean;
  isLoggedIn: boolean;
  device: any;

  setIsLoggedIn: (value: boolean) => void;
  setUser: (user: CitizenUser | null) => void;

  reloadUser: () => Promise<boolean>;
  logout: () => Promise<void>;
};

/* =========================================================
   CONTEXT
========================================================= */

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isLoggedIn: false,
  device: null,

  setIsLoggedIn: () => {},
  setUser: () => {},
  reloadUser: async () => false,
  logout: async () => {},
});

/* =========================================================
   PROVIDER
========================================================= */

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<CitizenUser | null>(null);

  const [device, setDevice] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  /* =======================================================
     LOAD CITIZEN SESSION
  ======================================================= */

  const loadSession = async (
    initialLoad = false
  ): Promise<boolean> => {
    try {
      if (initialLoad) {
        setLoading(true);
      }

      // Get current device.
      const dev = await getDeviceInfo();

      setDevice(dev);

      if (!dev?.deviceId) {
        setUser(null);
        setIsLoggedIn(false);
        return false;
      }

      // Get saved citizen ID.
      const savedUserId =
        await AsyncStorage.getItem("userId");

      if (!savedUserId) {
        setUser(null);
        setIsLoggedIn(false);
        return false;
      }

      // Fetch citizen document.
      const citizenRef = doc(
        db,
        "citizens",
        savedUserId
      );

      const snap = await getDoc(citizenRef);

      if (!snap.exists()) {
        setUser(null);
        setIsLoggedIn(false);
        return false;
      }

      const data = snap.data() as CitizenUser;

      // Check all supported device-registration formats.
      const currentDeviceId = dev.deviceId;

      const deviceAuthorised =
        data.registeredDeviceId === currentDeviceId ||
        data.registeredDevice?.deviceId === currentDeviceId ||
        !!data.devices?.[currentDeviceId];

      if (!deviceAuthorised) {
        console.log(
          "AuthContext: Device not authorised."
        );

        setUser(null);
        setIsLoggedIn(false);

        return false;
      }

      // Normalise fines.
      const fines = Array.isArray(data.fines)
        ? data.fines
        : [];

      // Save citizen profile in context.
      setUser({
        ...data,
        id: snap.id,
        fines,
      });

      setIsLoggedIn(true);

      return true;

    } catch (error) {
      console.error(
        "AuthContext load error:",
        error
      );

      setUser(null);
      setIsLoggedIn(false);

      // Keep the saved ID.
      // A temporary network failure must not erase it.

      return false;

    } finally {
      if (initialLoad) {
        setLoading(false);
      }
    }
  };
// INITIAL SESSION CHECK
useEffect(() => {
  loadSession(true);
}, []);
  /* =======================================================
     INITIAL SESSION CHECK
  ======================================================= */

   const logout = async (): Promise<void> => {
    // Clear the saved login session
    await AsyncStorage.removeItem("userId");

    // Clear the active citizen session
    setUser(null);
    setIsLoggedIn(false);

    console.log("AuthContext: User successfully logged out.");
  };
  /* =======================================================
     PROVIDER
  ======================================================= */

  return (
    <AuthContext.Provider
     value={{
  user,
  loading,
  isLoggedIn,
  device,
  setIsLoggedIn,
  setUser,
  reloadUser: loadSession,
  logout,
}}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* =========================================================
   AUTH HOOK
========================================================= */

export const useAuth = () =>
  useContext(AuthContext);
