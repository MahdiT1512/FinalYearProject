import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { getCountryFlagUrl, normalizeCountryCode } from "../../data/countries";

type Props = {
  countryCode?: string;
  size?: number;
};

//Displays a country flag based on the provided country code.
//If the code is invalid or missing, it shows a placeholder.
export default function CountryFlag({ countryCode, size = 18 }: Props) {
  const normalized = normalizeCountryCode(countryCode);
  const uri = getCountryFlagUrl(normalized);

  if (!normalized || !uri) {
    return (
      <View
        style={[
          styles.placeholder,
          { width: size, height: Math.round(size * 0.72) },
        ]}
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{
        width: size,
        height: Math.round(size * 0.72),
        borderRadius: 3,
      }}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#ddd",
    borderRadius: 3,
  },
});
