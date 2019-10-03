import React from "react";
import { View, Text } from "react-native";

import ZoomableBox from "../src/components/ZoomableBox";

const Example = () => {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ZoomableBox style={{ width: "80%", height: "40%" }}>
        <View style={{ backgroundColor: "red", flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "white", fontSize: 20 }}>Zoomable Box</Text>
        </View>
      </ZoomableBox>
    </View>
  );
};

export default Example;
