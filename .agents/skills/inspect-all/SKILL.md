# Skill: Apply Inspect Wrapping to All Screens

## Objective

Wrap every interactive/structural element in all `src/screens/*.js` files with the `<Inspect id="...">` component so the inspect overlay can identify each element by its component type, file, and line number.

## What Already Exists

- `src/components/Inspect.js` — wrapper that injects hover/tap handlers via `React.cloneElement`. Accepts `id` prop. **Zero layout impact** — no extra DOM elements.
- `src/components/InspectOverlay.js` — shows `componentName` + `file:line` on hover, auto-copies `id` after 2s
- `src/components/withInspect.js` — HOC wrapping screens (reads from store)
- `src/store/useStore.js` — has `inspectMode`, `inspectTarget`, `inspectInfo`, `inspectCopied`

## Files to Process

All files matching `src/screens/*.js` **except** `LoginScreen.js` and `ConnectShopScreen.js` (no Inspect wrapper needed — they're auth/splash screens). Process these:

- `CustomersScreen.js` — already done (reference)
- `InventoryScreen.js`
- `HistoryScreen.js`
- `SettingsScreen.js`
- `CheckoutScreen.js`
- `CustomerProfileScreen.js`

## Steps for Each Screen

### 1. Import Inspect

Add this import (if `Inspect` is already imported, skip):

```js
import Inspect from '../components/Inspect';
```

### 2. Identify Elements to Wrap

Wrap **only** these types of elements:
- **Interactive elements**: `TouchableOpacity`, `TouchableWithoutFeedback`, `Pressable`, `Button`
- **Input elements**: `TextInput` (wrap the whole row including label if it has one)
- **Structural containers**: `View` that serves as a distinct section/card/list item
- **Modal root**: the outer `View` inside a `Modal`
- **FlatList `renderItem`**: wrap each item card
- **Floating action buttons**: the `absolute` positioned buttons

**Do NOT wrap**: `Text`, `Image`, `Icon`/`LucideIcon` components alone, `ScrollView`/`FlatList`/`SectionList` containers (they're just scrolling wrappers), `SafeAreaView`.

### 3. ID Naming Convention

Use this format: `screen-name-element-role`

Examples:
- `inventory-search-bar`
- `inventory-product-card`
- `inventory-add-btn`
- `inventory-modal`
- `inventory-modal-image-picker`
- `inventory-modal-cancel-btn`
- `history-list-item`
- `history-empty-state`
- `settings-dark-mode-toggle`
- `settings-font-slider`
- `checkout-customer-card`
- `checkout-payment-method`
- `checkout-confirm-btn`
- `customer-profile-edit-btn`
- `customer-profile-delete-btn`

**Keep IDs short and descriptive.** Use `screen-name` prefix from the filename (e.g., `inventoryScreen.js` → `inventory`).

### 4. Wrapping Pattern

```jsx
// BEFORE
<TouchableOpacity
  className="flex-1 m-2 rounded-2xl"
  onPress={() => handleSelect(item)}
>
  <Text>{item.name}</Text>
</TouchableOpacity>

// AFTER
<Inspect id="inventory-product-card">
  <TouchableOpacity
    className="flex-1 m-2 rounded-2xl"
    onPress={() => handleSelect(item)}
  >
    <Text>{item.name}</Text>
  </TouchableOpacity>
</Inspect>
```

**Important**: The `Inspect` component uses `React.cloneElement` — it adds event handlers directly to the child element. No wrapper View is added. The child's `className`, `style`, `onPress`, etc. are all preserved unchanged.

### 5. Special Cases

**FlatList renderItem** — wrap the returned element:
```jsx
const renderItem = ({ item }) => (
  <Inspect id="inventory-product-card">
    <TouchableOpacity ...>
      ...
    </TouchableOpacity>
  </Inspect>
);
```

**Modal** — wrap the inner content View:
```jsx
<Modal visible={showModal}>
  <Inspect id="inventory-modal">
    <View className="flex-1 ...">
      ...
    </View>
  </Inspect>
</Modal>
```

**Nested elements in a modal** — wrap each interactive sub-element separately:
```jsx
<Inspect id="inventory-modal-image-picker">
  <TouchableOpacity onPress={pickImage}>...</TouchableOpacity>
</Inspect>
<Inspect id="inventory-modal-cancel-btn">
  <TouchableOpacity onPress={cancel}>...</TouchableOpacity>
</Inspect>
```

**Icon buttons inside a row** — wrap the outer `TouchableOpacity`, not the icon:
```jsx
<Inspect id="settings-close-btn">
  <TouchableOpacity onPress={handleClose}>
    <X size={24} color="..." />
  </TouchableOpacity>
</Inspect>
```

**TextInput** — wrap the row containing the label + input:
```jsx
<Inspect id="inventory-name-input">
  <View>
    <Text>Name</Text>
    <TextInput ... />
  </View>
</Inspect>
```

### 6. After Wrapping

- Verify the file imports `Inspect` from `../components/Inspect`
- Verify all wrapped elements have unique IDs
- Run `npm run test` to confirm no regressions

## Verification

1. `npm run test` — all tests pass
2. Open the app in inspect mode (eye FAB)
3. Hover over each element — overlay should show `ComponentName filename.js:line`
4. Hover for 2+ seconds — should auto-copy the ID and show "copied"
5. Each element should respond independently (no overlapping targets)

## Notes

- `Inspect` uses `React.cloneElement` — it reads `children.props.__source` for file/line info. This metadata is injected by React Native in dev mode. No manual annotation needed.
- `children.type.name` gives the component type (e.g., `TouchableOpacity`, `View`, `TextInput`).
- If an element doesn't have `__source`, the overlay falls back to showing just the component name.
- The overlay shows `componentName` as primary text and `file:line` as secondary dim text.
- `inspectTarget` stays as the raw `id` string for clipboard copying.
- `inspectInfo` holds `{ id, componentName, file, line }` for display.
