# UI & UX Modernization Plan

## Objective
Overhaul the user interface and user experience of the Grocery Shop App to feature a modern Android UI, dynamic settings menu, and streamlined interactions on the Customers and Checkout screens.

## Proposed Changes

### 1. Global Styling & Theming
*   **Modern Android UI:** Apply styling consistent with modern Android design principles.
*   **Dark Mode:** Implement global Dark Mode support, configurable via the new settings menu.
*   **Currency Formatting:** Replace dollar signs and "Due:" prefixes with a universal "Rs." format (e.g., `Rs. 500`).

### 2. Navigation & Dynamic Menu
*   **Circular Menu Button:** Add a prominent, circular menu button centered in the bottom tab bar between "Customers" and "Checkout".
*   **Dynamic Expansion:** Tapping the menu button will open a menu that emerges dynamically from the icon, taking up only as much vertical space as necessary for its contents (not a full-screen overlay). The bottom tabs will remain visible.
*   **Icon Morphing:** The menu icon will transform into a "collapse" or "close" icon when the menu is open.
*   **Menu Settings:** The expanded menu will include:
    *   Dark Mode toggle switch.
    *   Typography size range slider to globally adjust font sizes.
    *   Thumbnail size range slider to globally adjust image sizes.

### 3. Customers Screen Updates
*   **Inline Display:** Modify customer list items so that the Customer Name and their Due Amount (e.g., `Rs. 500`) are displayed on the exact same line, improving readability and saving vertical space.

### 4. Checkout Screen (Product Grid) Updates
*   **Image Tap to Add:** Change the primary interaction so that tapping a product image directly increases its quantity in the cart. The existing explicit `+` button will be removed.
*   **Red Minus Icon:** Overlay a simple, bordered red `-` (minus) icon on the product image to allow users to decrease the quantity.
*   **Text Overlay:** Place the Product Name and Price (e.g., `Milk Rs. 60`) on the same line, overlaid at the bottom of the product image.
*   **Readability Backdrop:** Add a semi-transparent dark shadow or opacity gradient behind the text overlay to ensure the text remains legible against varying product images.

## Implementation Steps
1.  **State Management:** Update global state (e.g., Zustand or Context) to support Dark Mode, Typography scaling, and Thumbnail scaling.
2.  **Navigation Bar Update:** Create a custom bottom tab bar to accommodate the central circular menu button and handle its dynamically expanding popover menu.
3.  **Dynamic Menu Component:** Build the expandable menu component with the required toggle and range sliders, implementing the morphing animation.
4.  **Screen Refactoring:**
    *   Update `CustomersScreen.js` to implement the inline text layout and "Rs." formatting.
    *   Update `CheckoutScreen.js` to implement the new image overlay interactions (tap to add, red minus overlay, gradient text backdrop).
5.  **Styling Pass:** Apply Modern Android UI principles across the affected screens and test in both light and dark modes.

## Verification
*   Verify the circular menu button opens a dynamically sized menu and the icon morphs correctly.
*   Verify Dark Mode toggles update the app's color scheme globally.
*   Verify Typography and Thumbnail sliders correctly scale text and image sizes globally.
*   Verify on the Customers screen that names and "Rs." amounts are on the same line without the "Due:" text.
*   Verify on the Checkout screen that tapping a product image increases quantity, tapping the red minus decreases it, and the explicit `+` button is removed.
*   Verify that Product Name and "Rs." Price are cleanly overlaid and legible on the product images.

## Deployment Strategy
*   **GitHub Actions Workflow:** Implement an automated EAS Build workflow (`.github/workflows/eas-build.yml`).
*   **Triggers:** Configured to trigger on pushes to the `main` branch.
*   **Workflow Steps:**
    *   Checkout repository.
    *   Setup Node.js (version 20).
    *   Authenticate with Expo/EAS using `expo/expo-github-action@v8` and an `EXPO_TOKEN` secret.
    *   Install project dependencies using `npm ci`.
    *   Run `eas build --platform all --non-interactive` to automatically build for Android and iOS.
