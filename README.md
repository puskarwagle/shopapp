# Grocery Shop App

A mobile-first, image-centric management application for small grocery shops. Built with React Native (Expo) and Supabase, it allows shop owners and employees to manage inventory, handle checkouts, and track customer dues with a simple, thumbnail-based interface.

## 🚀 Features

-   **Mobile-First UI:** Optimized for touch interactions with large, gallery-style thumbnails and a modern "squircle" (squared circle) design language.
-   **Customizable Experience:** Real-time adjustments for **Dark Mode**, **Typography** scaling, and **Thumbnail** sizes via a polished settings menu.
-   **Role-Based Access:**
    -   **Admin:** Full access to Inventory management, Customers, and Checkout.
    -   **Employee:** Access limited to Customers and Checkout only.
-   **Customer Management:** Image-grid of customers with live filtering and "Walk-in" support.
-   **Due Tracking:** Keep track of customers who will "pay later" directly at the checkout summary.
-   **Inventory Management (Admin):** Add/Edit/Delete products with image support (Camera/Gallery) and stock tracking.
-   **Web Support:** Develop and test directly in the browser using Expo Web.

## 🛠 Tech Stack

-   **Frontend:** React Native with [Expo](https://expo.dev/)
-   **Styling:** [NativeWind](https://www.nativewind.dev/) & React Native StyleSheet
-   **Animations:** [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
-   **State Management:** [Zustand](https://github.com/pmndrs/zustand)
-   **Backend:** [Supabase](https://supabase.com/) (Auth, PostgreSQL, Storage)
-   **Icons:** Lucide React Native

## 📋 Getting Started

### Prerequisites

-   Node.js (LTS)
-   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone <your-repo-url>
    cd shopapp
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up environment variables:
    Create a `.env` file in the root directory and add your Supabase credentials:
    ```env
    EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

### Running the App

Run the development server for the web:
```bash
npx expo start --web
```

To test on a physical device, download the **Expo Go** app and scan the QR code displayed in the terminal.

## 👥 User Roles (Development Logic)

Currently, user roles are determined by the login email:
-   **Admin:** Any email containing the word `admin` (e.g., `admin@shop.com`).
-   **Employee:** Any other valid email.

## 📦 Deployment

This app is ready to be built into an Android APK or iOS app using **EAS Build**:
```bash
# Example for Android
eas build --platform android --profile preview
```
