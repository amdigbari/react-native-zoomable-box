# ZoomableBox

ZoomableBox is a react Component that makes it's children zoomable

## Installation

```bash
yarn add react-native-zoomable-box
```

```bash
npm install --save react-native-zoomable-box
```

## Usage

```javascript
<ZoomableBox style={{ flex: 1 }}>
  <View style={{ backgroundColor: "red", flex: 1, alignItems: "center", justifyContent: "center" }}>
    <Text style={{ color: "white", fontSize: 20 }}>Zoomable Box</Text>
  </View>
</ZoomableBox>
```

## Props

Non of props are required.

| Parameter              | Type     | Default     |
| ---------------------- | -------- | ----------- |
| style                  | object   | { flex: 1 } |
| backToDefault          | boolean  | true        |
| swipeCompleteDirection | string   | 'y'         |
| swipeThreshold         | number   | 100         |
| doubleTapScale         | number   | 4           |
| maxScale               | number   | 4           |
| doubleTap              | boolean  | false       |
| animationTiming        | number   | 250         |
| maxDoubleTapDist       | number   | 25          |
| backHandler            | function | \_\_\_      |
| onSwipeComplete        | function | \_\_\_      |

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.
