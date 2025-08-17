import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors, spacing, typography, shadows } from "./theme";
import { ApiService, ChallengeCreateRequest } from "../services/apiService";
import RouteCreationPreview from "../components/RouteCreationPreview";
import { RouteStorage } from "../utils/routeStorage";
import { useFocusEffect } from "@react-navigation/native";

export default function CreateChallengeScreen() {
  interface RoutePoint {
    latitude: number;
    longitude: number;
    id: string;
  }

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    distance_km: "",
    stake: "",
    elevation: "",
    difficulty: "Easy" as "Easy" | "Moderate" | "Hard",
    max_participants: "",
    location: "",
    start_date: new Date(),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    polyline: "",
  });
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [routeDistance, setRouteDistance] = useState(0);

  // Load saved route data when returning from route creation
  useFocusEffect(
    useCallback(() => {
      const loadSavedRoute = async () => {
        try {
          const savedRoute = await RouteStorage.getTemporaryRoute();
          if (savedRoute) {
            setRoutePoints(savedRoute.points);
            setRouteDistance(savedRoute.distance);
            updateField('distance_km', savedRoute.distance.toFixed(2));
            updateField('polyline', savedRoute.polyline);
            console.log('Loaded saved route:', savedRoute);
          }
        } catch (error) {
          console.error('Error loading saved route:', error);
        }
      };
      loadSavedRoute();
    }, [])
  );

  // Clear route data when component unmounts (leaving the screen)
  useEffect(() => {
    return () => {
      // Cleanup function runs when component unmounts
      RouteStorage.clearTemporaryRoute().catch(error => {
        console.error('Error clearing route on unmount:', error);
      });
    };
  }, []);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"start" | "end">(
    "start",
  );
  const [tempDate, setTempDate] = useState(new Date());

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Update route distance when points change
  const updateRouteDistance = (points: RoutePoint[]) => {
    if (points.length < 2) {
      setRouteDistance(0);
      return;
    }

    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += calculateDistance(
        points[i - 1].latitude,
        points[i - 1].longitude,
        points[i].latitude,
        points[i].longitude
      );
    }
    setRouteDistance(totalDistance);
    
    // Auto-update distance field if route exists
    if (totalDistance > 0) {
      updateField('distance_km', totalDistance.toFixed(2));
    }
  };

  // Handle route creation
  const handleCreateRoute = () => {
    router.push({
      pathname: '/createRoute',
      params: {
        returnTo: 'createChallenge',
        existingPoints: JSON.stringify(routePoints),
      },
    });
  };

  // Handle route editing
  const handleEditRoute = () => {
    handleCreateRoute();
  };

  // Handle route clearing
  const handleClearRoute = () => {
    Alert.alert(
      "Clear Route",
      "Are you sure you want to clear the current route?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            setRoutePoints([]);
            setRouteDistance(0);
            updateField('distance_km', '');
            updateField('polyline', '');
            // Clear from storage as well
            RouteStorage.clearTemporaryRoute().catch(error => {
              console.error('Error clearing route:', error);
            });
          },
        },
      ]
    );
  };

  const openStartDatePicker = () => {
    setDatePickerMode("start");
    setTempDate(formData.start_date);
    setShowDatePicker(true);
  };

  const openEndDatePicker = () => {
    setDatePickerMode("end");
    setTempDate(formData.end_date);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const confirmDateSelection = () => {
    if (datePickerMode === "start") {
      setFormData((prev) => ({ ...prev, start_date: tempDate }));
    } else {
      setFormData((prev) => ({ ...prev, end_date: tempDate }));
    }
    setShowDatePicker(false);
  };

  const cancelDateSelection = () => {
    setShowDatePicker(false);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isFormValid = (): boolean => {
    return !!(
      formData.name.trim() &&
      formData.distance_km &&
      !isNaN(parseFloat(formData.distance_km)) &&
      formData.stake &&
      !isNaN(parseFloat(formData.stake)) &&
      formData.elevation &&
      !isNaN(parseInt(formData.elevation)) &&
      formData.max_participants &&
      !isNaN(parseInt(formData.max_participants)) &&
      formData.location.trim() &&
      formData.start_date &&
      formData.end_date &&
      formData.start_date < formData.end_date
    );
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Challenge name is required");
      return false;
    }
    if (!formData.distance_km || isNaN(parseFloat(formData.distance_km))) {
      Alert.alert("Error", "Valid distance is required");
      return false;
    }
    if (!formData.stake || isNaN(parseFloat(formData.stake))) {
      Alert.alert("Error", "Valid stake amount is required");
      return false;
    }
    if (!formData.elevation || isNaN(parseInt(formData.elevation))) {
      Alert.alert("Error", "Valid elevation is required");
      return false;
    }
    if (
      !formData.max_participants ||
      isNaN(parseInt(formData.max_participants))
    ) {
      Alert.alert("Error", "Valid max participants is required");
      return false;
    }
    if (!formData.location.trim()) {
      Alert.alert("Error", "Location is required");
      return false;
    }
    if (!formData.start_date || !formData.end_date) {
      Alert.alert("Error", "Start and end dates are required");
      return false;
    }
    if (formData.start_date >= formData.end_date) {
      Alert.alert("Error", "Start date must be before end date");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const challengeData: ChallengeCreateRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        distance_km: parseFloat(formData.distance_km),
        stake: parseFloat(formData.stake),
        elevation: parseInt(formData.elevation),
        difficulty: formData.difficulty,
        max_participants: parseInt(formData.max_participants),
        location: formData.location.trim(),
        start_date: formData.start_date.toISOString(),
        end_date: formData.end_date.toISOString(),
        created_by_profile_id: 1, // TODO: Get from auth context
        polyline: routePoints.length > 0 
          ? RouteStorage.encodePolyline(routePoints)
          : formData.polyline.trim() || "c~zbFfdtgVuHbBaFlGsApJrApJ`FlGtHbBtHcB`FmGrAqJsAqJaFmGuHcB", // Default Apple Park polyline
      };

      await ApiService.createChallenge(challengeData);
      
      // Clear route data after successful challenge creation
      await RouteStorage.clearTemporaryRoute();
      setRoutePoints([]);
      setRouteDistance(0);
      
      Alert.alert("Success", "Challenge created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Error creating challenge:", error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to create challenge",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Create Challenge</Text>
            <Text style={styles.subtitle}>
              Design your perfect running experience
            </Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trophy" size={20} color="#f97316" />
                <Text style={styles.sectionTitle}>Challenge Details</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Challenge Name *</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="flag"
                    size={16}
                    color="#9ca3af"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputWithIcon}
                    value={formData.name}
                    onChangeText={(value) => updateField("name", value)}
                    placeholder="Enter challenge name"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Description</Text>
                <View style={styles.textAreaWrapper}>
                  <Ionicons
                    name="document-text"
                    size={16}
                    color="#9ca3af"
                    style={styles.textAreaIcon}
                  />
                  <TextInput
                    style={styles.textAreaInput}
                    value={formData.description}
                    onChangeText={(value) => updateField("description", value)}
                    placeholder="Enter challenge description"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="fitness" size={20} color="#f97316" />
                <Text style={styles.sectionTitle}>Performance Metrics</Text>
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Distance (km) *</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="speedometer"
                      size={16}
                      color="#9ca3af"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.inputWithIcon}
                      value={formData.distance_km}
                      onChangeText={(value) =>
                        updateField("distance_km", value)
                      }
                      placeholder="5.0"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={[styles.fieldGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Elevation (m) *</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="trending-up"
                      size={16}
                      color="#9ca3af"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.inputWithIcon}
                      value={formData.elevation}
                      onChangeText={(value) => updateField("elevation", value)}
                      placeholder="100"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Difficulty *</Text>
                <View style={styles.difficultyButtons}>
                  {(["Easy", "Moderate", "Hard"] as const).map((level) => (
                    <Pressable
                      key={level}
                      style={[
                        styles.difficultyButton,
                        formData.difficulty === level &&
                          styles.difficultyButtonActive,
                      ]}
                      onPress={() => updateField("difficulty", level)}
                    >
                      <Ionicons
                        name={
                          level === "Easy"
                            ? "walk"
                            : level === "Moderate"
                              ? "bicycle"
                              : "flame"
                        }
                        size={16}
                        color={
                          formData.difficulty === level ? "white" : "#9ca3af"
                        }
                      />
                      <Text
                        style={[
                          styles.difficultyButtonText,
                          formData.difficulty === level &&
                            styles.difficultyButtonTextActive,
                        ]}
                      >
                        {level}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="cash" size={20} color="#f97316" />
                <Text style={styles.sectionTitle}>Stakes & Rewards</Text>
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Stake ($) *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.stake}
                    onChangeText={(value) => updateField("stake", value)}
                    placeholder="10.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>

              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Max Participants *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.max_participants}
                  onChangeText={(value) => updateField("max_participants", value)}
                  placeholder="20"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Location *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.location}
                  onChangeText={(value) => updateField("location", value)}
                  placeholder="Cupertino, CA"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Start Date *</Text>
                  <Pressable
                    style={styles.dateButton}
                    onPress={openStartDatePicker}
                  >
                    <Ionicons
                      name="calendar"
                      size={16}
                      color="#9ca3af"
                      style={styles.inputIcon}
                    />
                    <Text style={styles.dateButtonText}>
                      {formatDate(formData.start_date)}
                    </Text>
                  </Pressable>
                </View>

                <View style={[styles.fieldGroup, styles.halfWidth]}>
                  <Text style={styles.label}>End Date *</Text>
                  <Pressable
                    style={styles.dateButton}
                    onPress={openEndDatePicker}
                  >
                    <Ionicons
                      name="calendar"
                      size={16}
                      color="#9ca3af"
                      style={styles.inputIcon}
                    />
                    <Text style={styles.dateButtonText}>
                      {formatDate(formData.end_date)}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Route Creation Section */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Challenge Route</Text>
                <RouteCreationPreview
                  routePoints={routePoints}
                  distance={routeDistance}
                  onEdit={handleEditRoute}
                  onClear={handleClearRoute}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[
              styles.submitButton,
              (loading || !isFormValid()) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading || !isFormValid()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={styles.submitButtonText}>Create Challenge</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <Pressable onPress={cancelDateSelection}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </Pressable>
                <Text style={styles.datePickerTitle}>
                  Select {datePickerMode === "start" ? "Start" : "End"} Date
                </Text>
                <Pressable onPress={confirmDateSelection}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </Pressable>
              </View>
              <View style={styles.datePickerWrapper}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={
                    datePickerMode === "start"
                      ? new Date()
                      : formData.start_date
                  }
                  style={styles.datePicker}
                />
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: colors.background,
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  titleContainer: {
    alignItems: "center",
    flex: 1,
  },
  title: {
    ...typography.title,
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  placeholder: {
    width: 40, // Same width as back button for centering
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  form: {
    paddingVertical: spacing.lg,
  },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  textAreaWrapper: {
    position: "relative",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    backgroundColor: "#f9fafb",
  },
  textAreaIcon: {
    position: "absolute",
    left: spacing.md,
    top: spacing.md,
    zIndex: 1,
  },
  textAreaInput: {
    height: 80,
    paddingLeft: 40,
    paddingRight: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: "top",
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: "#f9fafb",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
    paddingLeft: 40, // Make room for the icon
    paddingTop: spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  difficultyButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  difficultyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    gap: spacing.xs,
  },
  difficultyButtonActive: {
    backgroundColor: "#f97316",
    borderColor: "#f97316",
    transform: [{ scale: 1.02 }],
  },
  difficultyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  difficultyButtonTextActive: {
    color: "white",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  datePickerContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area for iPhone
    width: "100%",
    flex: 0,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  datePickerCancel: {
    fontSize: 16,
    color: "#6b7280",
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f97316",
  },
  datePickerWrapper: {
    width: "100%",
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  datePicker: {
    height: 200,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "white",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f97316",
    paddingVertical: spacing.lg,
    borderRadius: 12,
    gap: spacing.sm,
    ...shadows.medium,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#9ca3af",
    ...shadows.card,
    elevation: 2,
  },
  submitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
