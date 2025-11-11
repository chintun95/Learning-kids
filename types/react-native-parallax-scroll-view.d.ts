// src/@types/react-native-parallax-scroll-view.d.ts
declare module "react-native-parallax-scroll-view" {
  import * as React from "react";
  import { ViewStyle, Animated, ImageSourcePropType } from "react-native";

  export interface ParallaxScrollViewProps {
    backgroundColor?: string;
    contentBackgroundColor?: string;
    parallaxHeaderHeight?: number;
    fadeOutForeground?: boolean;
    outputScaleValue?: number;
    onScroll?: (event: any) => void;
    style?: ViewStyle;
    renderBackground?: () => React.ReactNode;
    renderForeground?: () => React.ReactNode;
    renderFixedHeader?: () => React.ReactNode;
    renderStickyHeader?: () => React.ReactNode;
    stickyHeaderHeight?: number;
    backgroundSpeed?: number;
    children?: React.ReactNode;
  }

  export default class ParallaxScrollView extends React.Component<ParallaxScrollViewProps> {}
}
