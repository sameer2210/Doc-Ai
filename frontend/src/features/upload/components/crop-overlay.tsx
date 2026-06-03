import { LayoutRectangle, StyleSheet } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';

import { appTheme } from '@/theme';

type CropOverlayProps = {
  frameLayout: LayoutRectangle | null;
  screenWidth: number;
  screenHeight: number;
};

export function CropOverlay({ frameLayout, screenWidth, screenHeight }: CropOverlayProps) {
  const frame = frameLayout ? { ...frameLayout } : null;

  if (!frame) {
    return null;
  }

  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={screenWidth} height={screenHeight}>
      <Defs>
        <Mask id="crop-hole-mask">
          <Rect x={0} y={0} width={screenWidth} height={screenHeight} fill="white" />
          <Rect
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            rx={24}
            ry={24}
            fill="black"
          />
        </Mask>
      </Defs>
      <Rect
        x={0}
        y={0}
        width={screenWidth}
        height={screenHeight}
        fill="rgba(4, 8, 14, 0.74)"
        mask="url(#crop-hole-mask)"
      />
      <Rect
        x={0}
        y={0}
        width={frame.width}
        height={frame.height}
        rx={24}
        ry={24}
        fill="none"
        stroke={appTheme.colors.border.soft}
        strokeWidth={1.5}
      />
    </Svg>
  );
}
