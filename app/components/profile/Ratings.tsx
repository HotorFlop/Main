import { View, Text } from "react-native";
import React from "react";
import Animated from "react-native-reanimated";
import { StyleSheet } from "react-native";
import { COLORS, FONTS } from "../../constants/theme";

interface RatingsProps {
  item: {
    yes_count: number;
    no_count: number;
    total_count: number;
  };
}

const Ratings = ({ item }: RatingsProps) => {
  const yesPercentage =
    item.total_count > 0
      ? Math.round((item.yes_count / item.total_count) * 100)
      : 0;
  const noPercentage =
    item.total_count > 0
      ? Math.round((item.no_count / item.total_count) * 100)
      : 0;

  return (
    <View style={styles.cardContent}>
      <Text style={styles.resultsTitle}>Here's what people think</Text>
      <View style={styles.resultsContainer}>
        <View style={styles.barsContainer}>
          <View style={styles.barColumn}>
            <View style={styles.barBackground}>
              <Animated.View
                style={[
                  styles.bar,
                  styles.noBar,
                  {
                    height: `${noPercentage}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.percentageText}>{noPercentage}%</Text>
            <Text style={styles.barLabel}>No</Text>
          </View>
          <View style={styles.barColumn}>
            <View style={styles.barBackground}>
              <Animated.View
                style={[
                  styles.bar,
                  styles.yesBar,
                  {
                    height: `${yesPercentage}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.percentageText}>{yesPercentage}%</Text>
            <Text style={styles.barLabel}>Yes</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContent: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: 20,
    fontFamily: FONTS.mandali,
  },
  resultsContainer: {
    width: "100%",
    height: "80%",
    alignItems: "center",
    justifyContent: "center",
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 40,
    textAlign: "center",
    fontFamily: FONTS.mandali,
  },
  barsContainer: {
    flexDirection: "row",
    width: "100%",
    height: 300,
    justifyContent: "space-around",
    alignItems: "flex-end",
    marginTop: "auto",
    paddingBottom: 40,
  },
  barColumn: {
    alignItems: "center",
    width: 80,
  },
  barBackground: {
    width: "100%",
    height: 250,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 15,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  yesBar: {
    backgroundColor: "#E0CA3C",
  },
  noBar: {
    backgroundColor: "#A799B7",
  },
  percentageText: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
    fontFamily: FONTS.mandali,
    color: "#000",
  },
  barLabel: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
  },
});

export default Ratings;
