import React, { Component } from "react";
import { Animated, BackHandler, Easing } from "react-native";
import { PanGestureHandler, PinchGestureHandler, State, TapGestureHandler } from "react-native-gesture-handler";

const USE_NATIVE_DRIVER = true;
const SWIPE_COMPLETE_DIRECTION = {
  X: "x",
  Y: "y",
  BOTH: "both",
};

type Props = {
  backHandler?: Function,
  onSwipeComplete?: Function,
} & Partial<DefaultProps>;

type DefaultProps = {
  style: object,
  backToDefault: boolean,
  swipeCompleteDirection: "x" | "y" | "both",
  swipeThreshold: number,
  doubleTapScale: number,
  maxScale: number,
  doubleTap: boolean,
  animationTiming: number,
  maxDoubleTapDist: number,
};

const defaultProps: DefaultProps = {
  style: { flex: 1 },
  backToDefault: true,
  swipeCompleteDirection: "y",
  swipeThreshold: 100,
  doubleTapScale: 4,
  maxScale: 4,
  doubleTap: false,
  animationTiming: 250,
  maxDoubleTapDist: 25,
};

class ZoomableBox extends Component<Props> {
  static defaultProps = defaultProps;
  panRef = React.createRef();

  constructor(props) {
    super(props);

    this.state = {
      isImagePinched: false,
    };
  }

  componentDidMount() {
    if (this.props.backHandler) {
      this.backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
        if (this.pinchScaleValue !== 1 || this.lastScaleValue !== 1) {
          this.backToDefault();
          return true;
        } else {
          this.props.backHandler &&
            this.props.backHandler({ translateX: this.translateX, translateY: this.translateY, scale: this.scale });
        }
      });
    }
  }

  componentWillUnmount() {
    this.backHandler && this.backHandler.remove();
  }

  isSingleSwipe = !this.props.backToDefault;
  pinchScale = new Animated.Value(1);
  baseScale = new Animated.Value(1);
  translateX = new Animated.Value(0);
  translateY = new Animated.Value(0);
  scale = Animated.multiply(this.baseScale, this.pinchScale);

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

  onPanHandlerStateChange = ({ nativeEvent: { translationY, velocityY, velocityX, translationX, state } }) => {
    if (state === State.END) {
      if (
        this.lastScaleValue === 1 &&
        ((this.swipingDirection === SWIPE_COMPLETE_DIRECTION.Y &&
          this.props.swipeCompleteDirection !== SWIPE_COMPLETE_DIRECTION.X &&
          Math.abs(translationY) > this.props.swipeThreshold) ||
          (this.swipingDirection === SWIPE_COMPLETE_DIRECTION.X &&
            this.props.swipeCompleteDirection !== SWIPE_COMPLETE_DIRECTION.Y &&
            Math.abs(translationX) > this.props.swipeThreshold))
      ) {
        return this.onSwipeComplete({
          translateX: this.translateX,
          translateY: this.translateY,
          scale: this.scale,
          translationX,
          translationY,
          velocityY,
          velocityX,
          swipeDirection: this.swipingDirection,
        });
      } else {
        this.checkBorders(translationX, translationY);
      }

      if (this.props.backToDefault || this.lastScaleValue <= 1.2) {
        this.backToDefault();
      }
    }
  };

  zoomImageOnDoubleTap() {
    this.lastTranslate.x = this.calculateTranslateXForScale(this.props.doubleTapScale);
    this.lastTranslate.y = this.calculateTranslateYForScale(this.props.doubleTapScale);
    this.lastScaleValue = this.props.doubleTapScale;
    this.setState({ isImagePinched: true });
    this.animate(this.baseScale, this.lastScaleValue);
    this.animate(this.pinchScale, 1);
    this.animate(this.translateX, this.lastTranslate.x);
    this.animate(this.translateY, this.lastTranslate.y);
  }

  onDoubleTap = ({ nativeEvent: { x, y, state } }) => {
    if (state === State.ACTIVE) {
      if (this.props.doubleTap) {
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
    this.animate(this.translateY, 0, this.props.animationTiming, () => {
      this.setState({ isImagePinched: false });
    });
  };

  onSwipeComplete = this.props.onSwipeComplete || this.backToDefault;

  animate = (animatedValue, toValue, duration = this.props.animationTiming, cb) => {
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
      backToDefault,
      onSwipeComplete,
      swipeThreshold,
      maxScale,
      doubleTap,
      doubleTapScale,
      style,
      animationTiming,
      maxDoubleTapDist,
      children,
      backHandler,
      ...restProps
    } = this.props;

    return (
      <TapGestureHandler maxDist={maxDoubleTapDist} onHandlerStateChange={this.onDoubleTap} numberOfTaps={2}>
        <PanGestureHandler
          ref={this.panRef}
          onGestureEvent={this.onPanGestureEvent}
          onHandlerStateChange={this.onPanHandlerStateChange}
          minDist={10}
          minPointers={this.isSingleSwipe ? 1 : 2}
          maxPointers={this.isSingleSwipe ? 1 : 2}
          avgTouches>
          <PinchGestureHandler
            simultaneousHandlers={this.panRef}
            onGestureEvent={this.onPinchGestureEvent}
            onHandlerStateChange={this.onPinchHandlerStateChange}>
            <Animated.View
              {...restProps}
              onLayout={({
                nativeEvent: {
                  layout: { width, height },
                },
              }) => {
                this.centerX = width / 2;
                this.centerY = height / 2;

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
              ]}>
              {children}
            </Animated.View>
          </PinchGestureHandler>
        </PanGestureHandler>
      </TapGestureHandler>
    );
  }
}

export default ZoomableBox;
