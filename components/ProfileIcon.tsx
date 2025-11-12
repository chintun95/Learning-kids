import React from "react";
import {
  Image,
  ImageSourcePropType,
  StyleProp,
  ImageStyle,
} from "react-native";
import { responsive } from "@/utils/responsive";

interface ProfileIconProps {
  source: ImageSourcePropType;
  size?: number;
  style?: StyleProp<ImageStyle>;
}

const ProfileIcon: React.FC<ProfileIconProps> = ({ source, size, style }) => {
  const iconSize = size ?? responsive.profileIconSize();

  return (
    <Image
      source={source}
      style={[
        { width: iconSize, height: iconSize, borderRadius: iconSize / 2 },
        style,
      ]}
    />
  );
};

export default ProfileIcon;
