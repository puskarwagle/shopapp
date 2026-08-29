# MeroKirana scrape — research notes

Site: https://www.merokirana.com (Nepal online grocery)

## Architecture
- React SPA (`static/js/main.*.js`). Data is NOT in the HTML — it's fetched from a backend.
- Backend is **Semantro** ("Kirana" platform). Requests use JSON-LD style action descriptors
  (`@context:"http://semantro.com"`, `@type:"KiranaSearch"`, `actionName`).
- Firebase is used for auth/analytics, but product data goes through Semantro.

## The query endpoint (the key finding)
POST `https://www.merokirana.com/semantro-web-interface/query`

- Body must be **multipart/form-data** with a field `data` = `JSON.stringify(actionDescriptor)`.
  (A plain JSON body returns 403 Forbidden.)
- Required headers (simple HTTP client): `User-Agent` + `Referer: https://www.merokirana.com/`.
- Response is JSON (pretty-printed by the server). Lists come back as `itemListElement: [...]`.

### Working example
```
curl -X POST "https://www.merokirana.com/semantro-web-interface/query" \
  -H "User-Agent: Mozilla/5.0" -H "Referer: https://www.merokirana.com/" \
  -F 'data={"@context":"http://semantro.com","@type":"KiranaSearch","actionName":"listBaseCategories"}'
```

## Auth
- Listing (categories, products, prices) works **without any token**.
- Detailed product calls that need a token return `{"messageId":"tokenExpired",...}`.
- Login is OTP-based: `validateCustomer` (mutation, telephone) → `verifyOTP` (mutation,
  identifier + leiCode) → returns `authenticationCode` (the access token).
  Endpoint: `https://www.merokirana.com/semantro-web-interface/login`
- We do NOT need auth for the catalog we want: name / brand / category / price / availability
  are all obtainable unauthenticated.

## Data we can get WITHOUT auth
- `listBaseCategories` → top categories (identifier, categoryName, contentUrl image).
- `listChildCategories` (data: {identifier}) → subcategories.
- `listCategoryProducts` (data: {identifier}, pageLimit:{start,end}) → products in a category.
  Each item: `identifier`, `productID`, `productName`, `brandName`, `available`
  (`http://schema.org/InStock` / `OutOfStock`), `maxQuantity`, `tag`.
- `getProductData` (data: {identifier}) → `price`, `priceCurrency` ("NRs."), `categoryName`.
- `getListProductsCount` (data: {identifier}) → total product count for a category.

## Data that NEEDS auth (skip for now)
- `getProductDetailById`, `getCustomerProductPrice`, `listProductImages`, image endpoints.
- Product images: `listProductImages` returned empty for a sample product; images likely live on
  `https://cdn.merokirana.com/...` but the exact product-image path needs an authenticated token
  or more reverse-engineering. Left as a follow-up.

## Login flow (for product images / authenticated calls)
- Login is OTP-based, NOT password (the password field in the app is hex-encoded but the
  working path is telephone + OTP).
- Steps:
  1. `validateCustomer` (POST `/semantro-web-interface/mutation`, KiranaMutation) with
     `data: {telephone: "9864049501"}` → returns `identifier`.
  2. `verifyOTP` (POST `/semantro-web-interface/login`, KiranaMutation) with
     `data: {identifier, leiCode: "<OTP>"}` → returns `authenticationCode` (the access token).
- IMPORTANT: mutation/login responses are **double-encoded JSON strings**
  (`JSON.parse(JSON.parse(text))` to get the object). The query endpoint returns a normal object.
- The access token from login is sent on authenticated queries as header `accessToken: <token>`.
  Authenticated calls (getProductDetailById, listProductImages, getProductData with images) need it.
- OTPs are short-lived — automate the two steps back-to-back, or just copy the live token from the
  browser's localStorage after logging in.

## Extraction (local only — no DB write)
- `extract_products.js` walks the category tree and pulls every product unauthenticated:
  1. `listBaseCategories` → 10 base categories.
  2. `listChildCategories` per base → 80 leaf categories (subcategories).
  3. `listCategoryProducts` (paginated, 100/page) per leaf → product list.
  4. `getProductData` (identifier) per product → price + currency.
- Output: `merokirana_products.json` — **3868 products** (deduped by `productID`).
- Each record:
  ```json
  {
    "id": "2f5912a8-9c810552",   // productID (used as PK if loaded)
    "identifier": "3a5702d3126f4459-...", // Semantro identifier (for detail/image calls)
    "name": "Kook Boiled Rice, 5kg",
    "brand": "Kook",              // may be null
    "category": "1. Rice & Rice Products", // leaf category
    "parentCategory": "Grocery",  // base category
    "price": 900,
    "currency": "NRs.",
    "available": true,            // InStock
    "maxQuantity": 335
  }
  ```
- **DB scope:** extraction is LOCAL ONLY. `merokirana_products.json` is the deliverable.
  Nothing is written to Supabase `product_catalog` unless explicitly requested.
  (`load_catalog.js` exists as an optional loader that maps fields and inserts with
  `source='merokirana'` via the Management API — run it ONLY when the user asks to populate the DB.)
- Notes / gotchas:
  - Node 18+ global `fetch` + `FormData` (no `form-data` dep needed).
  - `listProductImages` / `getProductDetailById` need an auth token and were NOT used here.

## Images (fetched)
- **Image URLs ARE resolved** — solved via the public, no-auth `getMainImageProduct` query
  action (see `extract_images.js`), which returns `contentUrl` per product. Product image URLs
  follow `https://cdn.merokirana.com/archive/KiranaProduct/<hash>.jpg` (same CDN pattern as
  category images but under `KiranaProduct/`).
- `extract_images.js` writes `image_url` back into each record in `merokirana_products.json`.
  Resumable + rate-limited (CONCURRENCY/DELAY_MS env). Currently **3817/3868** products have
  an `image_url`; the rest have a genuinely missing image (no URL to reference).
- `download_images.js` downloads each product image locally into `images/products/`
  (`<identifier>_<slug>.<ext>`) — **3816 files (~206M)**. `images/` is git-ignored.
- **Supabase is populated.** `product_catalog` rows for `source='merokirana'` carry the CDN
  `image_url` (3806/3857 rows; the 51 without images have none in the source JSON).
  `update_images.js` is the loader used to sync `image_url` from the JSON into Supabase.

## Folder structure
```
scrapped_sites_data/
  fasto/                 Fasto reference data + scripts (417/2316 products)
  merokirana/
    NOTES.md             this file
    extract_products.js  no-auth extractor -> merokirana_products.json
    extract_images.js    no-auth image URL resolver -> writes image_url into JSON
    download_images.js   downloads images locally into images/products/ (git-ignored)
    update_images.js     syncs image_url from JSON into Supabase product_catalog
    load_catalog.js      optional Supabase loader (run only on request)
    merokirana_products.json   3868 extracted products (3817 with image_url)
    images/products/     3816 downloaded product images (~206M, git-ignored)
```

## Action name reference (69 total, from the bundle)
changeUserPassword, checkFirstLogin, getBannerCategory, getBannerCollection, getBannerProduct,
getCartData, getCategoryDetail, getClientSecret, getCollectionDetail, getCustomerDetail,
getCustomerProductPrice, getFreeCollection, getListProductsCount, getMainImageCategory,
getMainImageCollection, getMainImageKiranaList, getMainImageOffer, getMainImageProduct,
getMainImageUser, getOfferDetail, getOfferImage, getOffersCollection, getOrderName,
getOrderStatus, getOrderedProductCount, getPaymentInfo, getPaymentStatus, getPopularList,
getProductData, getProductDetail, getProductDetailById, getProductManufacturer, getProductOffer,
getProductQValue, getRecommendedList, getResetPasswordLink, getUserAddress, getUserCity,
getUserGeoLocation, listAllCollectionProducts, listBannerOffers, listBaseCategories,
listCategoryProducts, listChildCategories, listCollectionsOfCategory, listDefaultCategories,
listDefaultProducts, listFeaturedCategories, listFeaturedCollections, listFeaturedProducts,
listForExData, listKiranaListProducts, listLatestProducts, listMatchingProducts,
listOfferProducts, listOrderHistory, listOrderedProducts, listProductImages,
listPurchasedTogether, listSimilarProducts, listTopProducts, resendOTPCode, resetPassword,
searchCategories, searchProductCategories, searchProducts, trackCurrentOrders, validateCustomer,
verifyOTP
