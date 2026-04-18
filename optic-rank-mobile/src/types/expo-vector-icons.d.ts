declare module "@expo/vector-icons" {
  import React from "react";
  import type { TextProps } from "react-native";

  interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  type Icon = React.FC<IconProps> & {
    glyphMap: Record<string, number>;
  };

  export const Feather: Icon;
  export const Ionicons: Icon;
  export const MaterialIcons: Icon;
  export const MaterialCommunityIcons: Icon;
  export const FontAwesome: Icon;
  export const FontAwesome5: Icon;
  export const AntDesign: Icon;
  export const Entypo: Icon;
  export const EvilIcons: Icon;
  export const Octicons: Icon;
  export const SimpleLineIcons: Icon;
  export const Foundation: Icon;
}
