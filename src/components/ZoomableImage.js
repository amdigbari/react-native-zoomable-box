import React, { Component } from "react";
import { Animated, BackHandler, Easing, StyleSheet, View } from "react-native";
import { PanGestureHandler, PinchGestureHandler, State, TapGestureHandler } from "react-native-gesture-handler";

const USE_NATIVE_DRIVER = true;
const animationTiming = 250;
const SWIPE_TYPE = {
  double: "double",
  single: "single",
};

class ZoomableImage extends Component {
  panRef = React.createRef();

  constructor(props) {
    super(props);

    this.state = {
      isImagePinched: false,
    };
  }

  componentDidMount() {
    this.backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (this.pinchScaleValue !== 1 || this.lastScaleValue !== 1) {
        this.backToDefault();
      } else {
        this.onSwipe(0, 0);
      }
      return true;
    });
  }

  componentWillUnmount() {
    this.backHandler && this.backHandler.remove();
  }

  isSingleSwipe = this.props.swipeType === SWIPE_TYPE.single;
  pinchScale = new Animated.Value(1);
  baseScale = new Animated.Value(1);
  translateX = new Animated.Value(0);
  translateY = new Animated.Value(0);
  scale = Animated.multiply(this.baseScale, this.pinchScale);
  backgroundOpacity = this.translateY.interpolate({
    inputRange: [-this.props.swipeThreshold, 0, this.props.swipeThreshold],
    outputRange: [0.4, 1, 0.4],
    extrapolate: "extend",
  });

  pinchScaleValue = 1;
  lastScaleValue = 1;
  swipingDirection = null;
  lastTranslate = {
    x: 0,
    y: 0,
  };
  startFocal = {
    x: 0,
    y: 0,
  };
  center = {
    x: 0,
    y: 0,
  };
  image = {
    width: 0,
    height: 0,
  };

  calculateTranslateXForScale = scale => {
    return ((1 - scale) * (this.startFocal.x - this.centerX)) / (this.lastScaleValue * scale) + this.lastTranslate.x;
  };
  calculateTranslateYForScale = scale => {
    return ((1 - scale) * (this.startFocal.y - this.centerY)) / (this.lastScaleValue * scale) + this.lastTranslate.y;
  };

  onPinchGestureEvent = ({ nativeEvent }) => {
    const { scale } = nativeEvent;
    this.setState({ isImagePinched: true });
    if (this.isSingleSwipe) {
      this.pinchScale.setValue(scale);
      this.translateX.setValue(this.calculateTranslateXForScale(scale));
      this.translateY.setValue(this.calculateTranslateYForScale(scale));
    } else {
      this.pinchScaleValue = scale;
    }
  };

  setScaleToMaxScale = () => {
    this.lastScaleValue = this.props.maxScale;
    this.animate(this.baseScale, this.lastScaleValue);
    this.animate(this.pinchScale, 1);
    this.animate(this.translateX, this.lastTranslate.x);
    this.animate(this.translateY, this.lastTranslate.y);
  };

  zoomEnded = scale => {
    this.lastScaleValue *= scale;
    this.baseScale.setValue(this.lastScaleValue);
    this.pinchScale.setValue(1);
    this.lastTranslate.x += ((1 - scale) * (this.startFocal.x - this.centerX)) / this.lastScaleValue;
    this.lastTranslate.y += ((1 - scale) * (this.startFocal.y - this.centerY)) / this.lastScaleValue;
  };

  zoomedOverMaxScale = scale => {
    return this.lastScaleValue * scale >= this.props.maxScale;
  };

  onPinchHandlerStateChange = ({ nativeEvent: { scale, focalX, focalY, oldState } }) => {
    if (oldState === State.BEGAN) {
      this.startFocal.x = focalX;
      this.startFocal.y = focalY;
    } else if (oldState === State.ACTIVE) {
      if (this.isSingleSwipe) {
        if (this.zoomedOverMaxScale(scale)) {
          this.setScaleToMaxScale();
        } else {
          this.zoomEnded(scale);
        }
        this.checkBorders(0, 0);

        if (this.props.backToDefault || this.lastScaleValue <= 1.2) {
          this.backToDefault();
        }
      }
    }
  };

  onPanGestureEvent = ({ nativeEvent }) => {
    const { translationX, translationY } = nativeEvent;

    if (this.isSingleSwipe) {
      if (this.lastScaleValue === 1) {
        if (translationX && translationY && !this.swipingDirection) {
          this.swipingDirection = Math.abs(translationX) > Math.abs(translationY) ? "x" : "y";
        }
        if (this.swipingDirection === "x") {
          this.translateX.setValue(translationX / this.lastScaleValue + this.lastTranslate.x);
        } else if (this.swipingDirection === "y") {
          this.translateY.setValue(translationY / this.lastScaleValue + this.lastTranslate.y);
        }
      } else {
        this.translateX.setValue(translationX / this.lastScaleValue + this.lastTranslate.x);
        this.translateY.setValue(translationY / this.lastScaleValue + this.lastTranslate.y);
      }
    } else {
      this.pinchScale.setValue(this.pinchScaleValue);

      this.translateX.setValue(
        this.calculateTranslateXForScale(this.pinchScaleValue) + translationX / this.pinchScaleValue,
      );
      this.translateY.setValue(
        this.calculateTranslateYForScale(this.pinchScaleValue) + translationY / this.pinchScaleValue,
      );
    }
  };

  isTranslatedOverRightBorder = translationX => {
    return (
      this.lastTranslate.x + translationX / this.lastScaleValue <
      ((1 - this.lastScaleValue) * this.image.width) / (2 * this.lastScaleValue)
    );
  };
  isTranslatedOverLeftBorder = translationX => {
    return (
      this.lastTranslate.x + translationX / this.lastScaleValue >
      ((this.lastScaleValue - 1) * this.image.width) / (2 * this.lastScaleValue)
    );
  };
  isTranslatedOverBottomBorder = translationY => {
    return (
      this.lastTranslate.y + translationY / this.lastScaleValue <
      ((1 - this.lastScaleValue) * this.image.height) / (2 * this.lastScaleValue)
    );
  };
  isTranslatedOverTopBorder = translationY => {
    return (
      this.lastTranslate.y + translationY / this.lastScaleValue >
      ((this.lastScaleValue - 1) * this.image.height) / (2 * this.lastScaleValue)
    );
  };

  translateToRightBorder = () => {
    this.lastTranslate.x = ((1 - this.lastScaleValue) * this.image.width) / (2 * this.lastScaleValue);
    this.animate(this.translateX, this.lastTranslate.x);
  };
  translateToTopBorder() {
    this.lastTranslate.y = ((this.lastScaleValue - 1) * this.image.height) / (2 * this.lastScaleValue);
    this.animate(this.translateY, this.lastTranslate.y);
  }
  translateToBottomBorder() {
    this.lastTranslate.y = ((1 - this.lastScaleValue) * this.image.height) / (2 * this.lastScaleValue);
    this.animate(this.translateY, this.lastTranslate.y);
  }
  translateToLeftBorder() {
    this.lastTranslate.x = ((this.lastScaleValue - 1) * this.image.width) / (2 * this.lastScaleValue);
    this.animate(this.translateX, this.lastTranslate.x);
  }

  checkBorders = (translationX, translationY) => {
    if (this.isTranslatedOverRightBorder(translationX)) {
      this.translateToRightBorder();
    } else if (this.isTranslatedOverLeftBorder(translationX)) {
      this.translateToLeftBorder();
    } else {
      this.lastTranslate.x += translationX / this.lastScaleValue;
    }

    if (this.isTranslatedOverBottomBorder(translationY)) {
      this.translateToBottomBorder();
    } else if (this.isTranslatedOverTopBorder(translationY)) {
      this.translateToTopBorder();
    } else {
      this.lastTranslate.y += translationY / this.lastScaleValue;
    }
  };

  getImageHideTranslateY = () => this.centerY + this.image.height / 2;

  onPanHandlerStateChange = ({ nativeEvent: { translationY, velocityY, translationX, state } }) => {
    if (state === State.END) {
      if (
        this.lastScaleValue === 1 &&
        this.swipingDirection === "y" &&
        Math.abs(translationY) > this.props.swipeThreshold
      ) {
        return this.onSwipe(translationY, velocityY);
      } else {
        this.checkBorders(translationX, translationY);
      }

      if (this.props.backToDefault || this.lastScaleValue <= 1.2) {
        this.backToDefault();
      }
    }
  };

  onSwipe(translationY, velocityY) {
    const toValue = (translationY < 0 ? -1 : 1) * this.getImageHideTranslateY();
    const duration = Math.min(Math.abs(((translationY - toValue) * 1000) / velocityY), 200);
    return this.animate(this.translateY, toValue, duration, this.props.onSwipeComplete);
  }

  zoomImageOnDoubleTap() {
    this.lastTranslate.x = this.calculateTranslateXForScale(this.props.maxScale);
    this.lastTranslate.y = this.calculateTranslateYForScale(this.props.maxScale);
    this.lastScaleValue = this.props.maxScale;
    this.setState({ isImagePinched: true });
    this.animate(this.baseScale, this.lastScaleValue);
    this.animate(this.pinchScale, 1);
    this.animate(this.translateX, this.lastTranslate.x);
    this.animate(this.translateY, this.lastTranslate.y);
  }

  onDoubleTap = ({ nativeEvent: { x, y, state } }) => {
    if (state === State.ACTIVE) {
      if (this.props.activeDoubleTap) {
        this.startFocal.x = x;
        this.startFocal.y = y;
        if (this.lastScaleValue > 1) {
          this.backToDefault();
        } else {
          this.zoomImageOnDoubleTap();
        }
      }
    }
  };

  backToDefault = () => {
    this.swipingDirection = null;
    this.pinchScaleValue = 1;
    this.lastScaleValue = 1;
    this.animate(this.pinchScale, 1);
    this.animate(this.baseScale, 1);
    this.lastTranslate.x = 0;
    this.lastTranslate.y = 0;
    this.animate(this.translateX, 0);
    this.animate(this.translateY, 0, animationTiming, () => {
      this.setState({ isImagePinched: false });
    });
  };

  animate = (animatedValue, toValue, duration = animationTiming, cb) => {
    animatedValue.stopAnimation(() => {
      Animated.timing(animatedValue, {
        toValue: toValue,
        duration,
        easing: Easing.linear,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start(cb);
    });
  };

  render() {
    const {
      swipeType,
      backToDefault,
      onSwipeComplete,
      swipeThreshold,
      maxScale,
      activeDoubleTap,
      doubleTapScale,
      style,
      wrapperStyle,
      ImageComponent,
      ...restProps
    } = this.props;

    let renderOverlayOpacity = this.state.isImagePinched ? 1 : this.backgroundOpacity;

    return (
      <TapGestureHandler maxDist={25} onHandlerStateChange={this.onDoubleTap} numberOfTaps={2}>
        <PanGestureHandler
          ref={this.panRef}
          onGestureEvent={this.onPanGestureEvent}
          onHandlerStateChange={this.onPanHandlerStateChange}
          minDist={10}
          minPointers={swipeType === SWIPE_TYPE.single ? 1 : 2}
          maxPointers={swipeType === SWIPE_TYPE.single ? 1 : 2}
          avgTouches>
          <PinchGestureHandler
            simultaneousHandlers={this.panRef}
            onGestureEvent={this.onPinchGestureEvent}
            onHandlerStateChange={this.onPinchHandlerStateChange}>
            <View
              style={[styles.wrapperStyle, wrapperStyle]}
              onLayout={({
                nativeEvent: {
                  layout: { width, height },
                },
              }) => {
                this.centerX = width / 2;
                this.centerY = height / 2;
              }}>
              <Animated.View
                style={[styles.overlayStyle, this.props.overlayStyle, { opacity: renderOverlayOpacity }]}
              />
              <ImageComponent
                {...restProps}
                onLayout={({
                  nativeEvent: {
                    layout: { width, height },
                  },
                }) => {
                  this.image = {
                    width,
                    height,
                  };
                }}
                style={[
                  style,
                  {
                    transform: [
                      { perspective: 200 },
                      { scale: this.isSingleSwipe ? this.scale : this.pinchScale },
                      { translateX: this.translateX },
                      { translateY: this.translateY },
                    ],
                  },
                ]}
              />
            </View>
          </PinchGestureHandler>
        </PanGestureHandler>
      </TapGestureHandler>
    );
  }
}

export default ZoomableImage;

const styles = StyleSheet.create({
  wrapperStyle: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayStyle: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "black",
  },
});

ZoomableImage.defaultProps = {
  style: {},
  source: {},
  swipeType: "double",
  backToDefault: true,
  swipeEnabled: false,
  onSwipeComplete: () => {},
  swipeThreshold: 100,
  maxScale: 4,
  activeDoubleTap: false,
  ImageComponent: Animated.Image,
};
