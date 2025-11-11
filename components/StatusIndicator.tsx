import React from "react";
import { View, StyleProp, ViewStyle } from "react-native";
import ProfileIcon from "./ProfileIcon";

type Status = "green" | "yellow" | "red";

interface StatusIndicatorProps {
  status: Status; // status color
  iconSource: any; // profile icon source (require or uri)
  size?: number; // profile icon size
  borderWidth?: number; // thickness of the status border
  style?: StyleProp<ViewStyle>; // optional wrapper style for positioning
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  iconSource,
  size,
  borderWidth = 4,
  style,
}) => {
  const iconSize = size ?? 60; // default size if none provided

  // Map status to color
  const statusColors: Record<Status, string> = {
    green: "#22C55E",
    yellow: "#FACC15",
    red: "#EF4444",
  };

  return (
    <View
      style={[
        {
          width: iconSize + borderWidth * 2,
          height: iconSize + borderWidth * 2,
          borderRadius: (iconSize + borderWidth * 2) / 2,
          borderWidth: borderWidth,
          borderColor: statusColors[status],
          justifyContent: "center",
          alignItems: "center",
        },
        style,
      ]}
    >
      <ProfileIcon source={iconSource} size={iconSize} />
    </View>
  );
};

export default StatusIndicator;
