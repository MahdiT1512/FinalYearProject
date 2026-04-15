import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { getCountryFlagUrl, normalizeCountryCode } from "../../data/countries";

type Props = {
  countryCode?: string;
  size?: number;
};

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
