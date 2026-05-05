import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import {
  COUNTRIES,
  getCountryName,
  getFlagEmoji,
  normalizeCountryCode,
} from "../../data/countries";

type Props = {
  value: string;
  onChange: (countryCode: string) => void;
  label?: string;
};

//A field component that allows users to select a country from a list of options
//Created due to issues with existing react narive country picker libaries not being updated
export default function CountryPickerField({
  value,
  onChange,
  label = "Country",
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;

    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(q) ||
        country.code.toLowerCase().includes(q),
    );
  }, [search]);

  const selectedCode = normalizeCountryCode(value);
  const selectedName = selectedCode ? getCountryName(selectedCode) : "";
  const selectedFlag = selectedCode ? getFlagEmoji(selectedCode) : "";

  return (
    <View>
      <Text style={styles.label}>{label}</Text>

      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={styles.fieldText}>
          {selectedCode
            ? `${selectedFlag} ${selectedName}`
            : "Select a country"}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Choose Country</Text>
            <Pressable
              style={styles.closeButton}
              onPress={() => setOpen(false)}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search country"
            style={styles.searchInput}
          />

          <ScrollView contentContainerStyle={styles.listContent}>
            {filtered.map((country) => (
              <Pressable
                key={country.code}
                style={styles.option}
                onPress={() => {
                  onChange(country.code);
                  setOpen(false);
                  setSearch("");
                }}
              >
                <Text style={styles.optionText}>
                  {getFlagEmoji(country.code)} {country.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
  },
  field: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  fieldText: {
    fontSize: 15,
    color: "#222",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  headerRow: {
    marginTop: 10,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  closeButton: {
    backgroundColor: "#eee",
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 18,
    fontWeight: "800",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    marginBottom: 14,
  },
  listContent: {
    paddingBottom: 40,
  },
  option: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  optionText: {
    fontSize: 16,
  },
});
