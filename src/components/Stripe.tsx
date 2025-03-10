import {
  Reader,
  useStripeTerminal,
} from "@stripe/stripe-terminal-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";

import Button from "../components/Button";
import { useLocation } from "../lib/useLocation";

export default function Stripe() {
  const { initialize } = useStripeTerminal();
  useEffect(() => {
    initialize();
  }, [initialize]);
  return <PageStripe />;
}

interface PaymentIntent {
  id: string;
  amount: number;
  created: string;
  currency: string;
  sdkUuid: string;
  paymentMethodId: string;
}

export function PageStripe() {
  const { accessDenied } = useLocation();
  // const { location, accessDenied } = useLocation();

  const [value, setValue] = useState(0);
  const [reader, setReader] = useState<Reader.Type | undefined>(undefined);
  const [payment, setPayment] = useState<PaymentIntent>();
  const [loadingCreatePayment, setLoadingCreatePayment] = useState(false);
  const [loadingCollectPayment, setLoadingCollectPayment] = useState(false);
  const [loadingConfirmPayment, setLoadingConfirmPayment] = useState(false);
  const [loadingConnectingReader, setLoadingConnectingReader] = useState(false);

  const locationIdStripeMock = "tml_FrcFgksbiIZZ2V";

  const {
    discoverReaders,
    connectLocalMobileReader,
    createPaymentIntent,
    collectPaymentMethod,
    confirmPaymentIntent,
    connectedReader,
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: (readers: Reader.Type[]) => {
      setReader(readers[0]);
    },
  });

  useEffect(() => {
    discoverReaders({
      discoveryMethod: "localMobile",
      simulated: false,
    });
  }, [discoverReaders]);

  async function connectReader(selectedReader: Reader.Type) {
    setLoadingConnectingReader(true);
    try {
      const { error } = await connectLocalMobileReader({
        reader: selectedReader,
        locationId: locationIdStripeMock,
      });

      if (error) {
        console.log("connectLocalMobileReader error:", error);
        return;
      }

      Alert.alert("Reader connected successfully");
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingConnectingReader(false);
    }
  }

  async function paymentIntent() {
    setLoadingCreatePayment(true);
    try {
      const { error, paymentIntent } = await createPaymentIntent({
        amount: Number((value * 100).toFixed()),
        currency: "usd",
        paymentMethodTypes: ["card_present"],
        offlineBehavior: "prefer_online",
      });

      if (error) {
        console.log("Error creating payment intent", error);
        return;
      }

      setPayment(paymentIntent);

      Alert.alert("Payment intent created successfully");
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingCreatePayment(false);
    }
  }

  async function collectPayment() {
    setLoadingCollectPayment(true);
    try {
      const { error } = await collectPaymentMethod({
        // @ts-expect-error works without extra PaymentIntent props
        paymentIntent: payment,
      });

      if (error) {
        console.log("Error collecting payment", error);
        Alert.alert("Error collecting payment", error.message);
        return;
      }

      Alert.alert("Payment successfully collected", "", [
        {
          text: "Ok",
          onPress: async () => {
            await confirmPayment();
          },
        },
      ]);
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingCollectPayment(false);
    }
  }

  async function confirmPayment() {
    setLoadingConfirmPayment(true);
    console.log("foo", { payment });
    try {
      const { error } = await confirmPaymentIntent({
        // @ts-expect-error works without extra PaymentIntent props
        paymentIntent: payment,
      });

      if (error) {
        console.log("Error confirm payment", error);
        return;
      }

      Alert.alert("Payment successfully confirmed!", "Congratulations");
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingConfirmPayment(false);
    }
  }

  async function handleRequestLocation() {
    await Linking.openSettings();
  }

  useEffect(() => {
    if (accessDenied) {
      Alert.alert(
        "Access to location",
        "To use the app, you need to allow the use of your device location.",
        [
          {
            text: "Activate",
            onPress: handleRequestLocation,
          },
        ],
      );
    }
  }, [accessDenied]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          flex: 1,
        }}
      >
        <View style={{ paddingTop: 10, gap: 10 }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            Stripe
          </Text>
        </View>
        <View style={{ gap: 10 }}>
          <View style={{ marginBottom: 20, gap: 10 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#635AFF",
              }}
            >
              Amount to be charged
            </Text>
            <TextInput
              style={{
                borderColor: "#635AFF",
                borderWidth: 1,
                borderRadius: 8,
                padding: 15,
              }}
              placeholder="Enter the value"
              onChangeText={(inputValue) => setValue(Number(inputValue))}
              keyboardType="numeric"
            />
          </View>

          <Button
            onPress={() => {
              if (reader) {
                connectReader(reader);
              } else {
                Alert.alert("No reader available");
              }
            }}
            loading={loadingConnectingReader}
          >
            Connecting with the reader{"disabled" + !!connectedReader}
          </Button>

          <Button onPress={paymentIntent} loading={loadingCreatePayment}>
            Create payment intent{"disabled" + !connectedReader}
          </Button>

          <Button onPress={collectPayment} loading={loadingCollectPayment}>
            Collect payment{"disabled" + !connectedReader}
          </Button>

          <Button onPress={confirmPayment} loading={loadingConfirmPayment}>
            Confirm payment
          </Button>
        </View>
        <View></View>
      </View>
    </SafeAreaView>
  );
}
