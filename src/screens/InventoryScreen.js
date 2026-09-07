import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Modal, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Camera, Image as ImageIcon, X, Trash2, Search, ChevronLeft, Tag, Package, Sparkles } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import useStore from '../store/useStore';
import { createFuse, smartSearch } from '../lib/search';
import Inspect from '../components/Inspect';

const CATEGORY_ICONS = {
  'Ice-cream & Popsicles': '🍦', 'Soft Drinks & Juices': '🥤', 'Chocolates & Sweets': '🍫',
  'Chips, Cheese Balls & Snacks': '🍿', 'Tea & Coffee': '☕', 'Skin Care Essentials': '🧴',
  'Home Care': '🏠', 'Beauty & Personal Care': '💄', 'Hard Drinks & Liquors': '🍶',
  'Ketchups, Sauces & Pickles': '🫙', 'Biscuits & Cookies': '🍪', 'Namkeen & Dalmot': '🥜',
  'Pasta, Noodles & Soup': '🍜', 'Baby Care Essentials': '👶', 'Detergents': '🧺',
  'Kitchen Essentials': '🍳', 'Health Supplements': '💊', 'Oral Care': '🪥',
  'Deodrants & Perfumes': '🧴', 'Hair Care Essentials': '💇', 'Cooking Oil': '🫒',
  'Masala, Papad & Herbs': '🌶️', 'Footware & Shoe Care': '👟', 'Dry Fruits & Nuts': '🥜',
  'Korean Snacks': '🇰🇷', 'Stationery': '✏️', 'First Aid': '🩹', 'Smokes': '🚬',
  'Daal': '🫘', 'Rice': '🍚', 'Spreads & Jams': '🍯', 'Breakfast & Cereals': '🥣',
  'Dairy': '🥛', 'Bakery': '🍞', 'Pet Care': '🐾', 'Toys': '🧸',
  'Mobile Accessories': '📱', 'Celebrations': '🎉', 'Geda Gudi': '🧹',
  'Sexual Wellness': '💊', 'Female Hygiene': '🩹', 'Mens Grooming': '💇',
  'Health Care Essentials': '💊', 'Home Appliances': '🔌', 'Kitchen Wares': '🍴',
  'Salt & Sugar': '🧂', 'Milk & Health Drinks': '🥛', 'Chiura, Bhuja and Masyura': '🍘',
  'Aata, Maida & Other Flours': '🌾', 'Baking Essentials': '🧁',
};

export default function InventoryScreen() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', stock: '', image: null });
  const [addMode, setAddMode] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [invSearch, setInvSearch] = useState('');
  const {
    products, addProduct, deleteProduct, seedSampleInventory, isDarkMode, fontSizeScale, thumbnailScale,
    productCatalog, catalogCategories, fetchCatalog,
  } = useStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchCatalog();
  }, []);

  const invFuse = useMemo(() => createFuse(products, ['name']), [products]);
  const displayedProducts = useMemo(
    () => smartSearch(products, invSearch, invFuse) ?? products,
    [invFuse, invSearch, products]
  );

  const catalogFuse = useMemo(
    () => createFuse(productCatalog, ['name', 'brand', 'subcategory']),
    [productCatalog]
  );
  const catalogResults = useMemo(
    () => smartSearch(productCatalog, catalogSearch, catalogFuse),
    [productCatalog, catalogSearch, catalogFuse]
  );

  const categoryProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return productCatalog.filter(p => p.category === selectedCategory);
  }, [productCatalog, selectedCategory]);

  const pickImage = async (useCamera = false) => {
    let result;
    if (useCamera) {
      await ImagePicker.requestCameraPermissionsAsync();
      result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    }
    if (!result.canceled) {
      setNewProduct({ ...newProduct, image: result.assets[0].uri });
    }
  };

  const handleAddCustomProduct = () => {
    const product = {
      name: newProduct.name,
      price: parseFloat(newProduct.price),
      stock: parseInt(newProduct.stock) || 0,
      image: newProduct.image || 'https://via.placeholder.com/150/f1f5f9/64748b?text=Product',
    };
    addProduct(product);
    closeModal();
  };

  const handleSeed = () => {
    const res = seedSampleInventory();
    const msg = res.ok
      ? `Added ${res.added} products${res.skipped ? ` (${res.skipped} already in inventory)` : ''}.`
      : (res.error || 'Could not seed inventory.');
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert('Seed inventory', msg);
    }
    closeModal();
  };

  const handleAddCatalogProduct = () => {
    const product = {
      name: selectedCatalogProduct.name,
      price: parseFloat(editPrice) || selectedCatalogProduct.price || 0,
      stock: parseInt(editStock) || 0,
      image: selectedCatalogProduct.image_url || 'https://via.placeholder.com/150/f1f5f9/64748b?text=Product',
    };
    addProduct(product);
    closeModal();
  };

  const closeModal = () => {
    setShowAddModal(false);
    setAddMode(null);
    setSelectedCategory(null);
    setCatalogSearch('');
    setSelectedCatalogProduct(null);
    setEditPrice('');
    setEditStock('');
    setNewProduct({ name: '', price: '', stock: '', image: null });
  };

  const confirmDelete = (product) => {
    const doDelete = () => deleteProduct(product.id);
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${product.name}"?`)) doDelete();
      return;
    }
    Alert.alert('Delete Product', `Remove "${product.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  const renderProduct = ({ item }) => (
    <Inspect id="inventory-product-card">
    <View
      className={`flex-1 m-2 rounded-2xl shadow-sm border overflow-hidden ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
      }`}
      style={{ transform: [{ scale: thumbnailScale }] }}
    >
      <Image source={{ uri: item.image }} className="w-full aspect-square" />
      <View className="p-3">
        <Text
          className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
          style={{ fontSize: 14 * fontSizeScale }}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <View className="flex-row justify-between items-center mt-1">
          <Text className="text-blue-500 font-semibold" style={{ fontSize: 13 * fontSizeScale }}>Rs. {item.price.toFixed(2)}</Text>
          <Text className={isDarkMode ? 'text-slate-500 text-xs' : 'text-slate-400 text-xs'}>Stock: {item.stock}</Text>
        </View>
        <TouchableOpacity className="mt-2 items-end" onPress={() => confirmDelete(item)}>
          <Trash2 size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
    </Inspect>
  );

  const renderCatalogProduct = ({ item, key }) => (
    <Inspect id="inventory-catalog-item">
    <TouchableOpacity
      key={key || item.id}
      onPress={() => {
        setSelectedCatalogProduct(item);
        setEditPrice(String(item.price || ''));
        setEditStock('0');
        setCatalogSearch('');
      }}
      className={`flex-row items-center p-3 rounded-xl mb-2 border ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
      }`}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} className="w-14 h-14 rounded-lg" />
      ) : (
        <View className={`w-14 h-14 rounded-lg items-center justify-center ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
          <Package size={20} color={isDarkMode ? '#94a3b8' : '#94a3b8'} />
        </View>
      )}
      <View className="flex-1 ml-3">
        <Text className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`} numberOfLines={2} style={{ fontSize: 13 * fontSizeScale }}>
          {item.name}
        </Text>
        <View className="flex-row items-center mt-1">
          {item.brand && <Text className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{item.brand}</Text>}
          {item.discount_percent > 0 && (
            <View className="bg-green-100 rounded px-1.5 py-0.5 ml-2">
              <Text className="text-green-700 text-xs font-bold">-{item.discount_percent}%</Text>
            </View>
          )}
        </View>
      </View>
      <Text className="text-blue-500 font-bold" style={{ fontSize: 13 * fontSizeScale }}>
        Rs. {item.price}
      </Text>
    </TouchableOpacity>
    </Inspect>
  );

  const renderCategory = ({ item, key }) => {
    const count = productCatalog.filter(p => p.category === item).length;
    return (
      <Inspect id="inventory-category-item">
      <TouchableOpacity
        key={key || item}
        onPress={() => { setSelectedCategory(item); setCatalogSearch(''); }}
        className={`flex-row items-center p-4 rounded-xl mb-2 border ${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
        }`}
      >
        <Text className="text-2xl mr-3">{CATEGORY_ICONS[item] || '📦'}</Text>
        <View className="flex-1">
          <Text className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`} style={{ fontSize: 15 * fontSizeScale }}>
            {item}
          </Text>
          <Text className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{count} products</Text>
        </View>
        <ChevronLeft size={18} color={isDarkMode ? '#64748b' : '#94a3b8'} style={{ transform: [{ rotate: '180deg' }] }} />
      </TouchableOpacity>
      </Inspect>
    );
  };

  const renderStepHeader = () => {
    let title = 'Add Product';
    let canGoBack = false;

    if (addMode === 'catalog' && selectedCatalogProduct) {
      title = 'Set Price & Stock';
      canGoBack = true;
    } else if (addMode === 'catalog' && selectedCategory) {
      title = selectedCategory;
      canGoBack = true;
    } else if (addMode === 'catalog') {
      title = 'Browse Catalog';
      if (catalogSearch.trim()) canGoBack = true;
    } else if (addMode === 'custom') {
      title = 'Add Custom Product';
    }

    return (
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center flex-1">
          {canGoBack && (
            <Inspect id="inventory-modal-back-btn">
            <TouchableOpacity             onPress={() => {
              if (selectedCatalogProduct) {
                setSelectedCatalogProduct(null);
                setCatalogSearch('');
              } else if (catalogSearch.trim()) {
                setCatalogSearch('');
              } else {
                setSelectedCategory(null);
              }
            }} className="mr-3">
              <ChevronLeft size={24} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
            </Inspect>
          )}
          <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 20 * fontSizeScale }}>
            {title}
          </Text>
        </View>
        <Inspect id="inventory-modal-cancel-btn">
        <TouchableOpacity onPress={closeModal}>
          <X size={24} color={isDarkMode ? '#94a3b8' : '#64748b'} />
        </TouchableOpacity>
        </Inspect>
      </View>
    );
  };

  const renderSearchBar = () => {
    if (!addMode) return null;
    const placeholder = addMode === 'catalog' && !selectedCatalogProduct
      ? 'Search products...'
      : '';

    if (!placeholder) return null;

    return (
      <View className={`flex-row items-center rounded-xl px-3 py-2.5 mb-4 border ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
      }`}>
        <Search size={18} color={isDarkMode ? '#64748b' : '#94a3b8'} />
        <TextInput
          className={`flex-1 ml-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
          style={{ fontSize: 14 * fontSizeScale, outlineStyle: 'none' }}
          placeholder={placeholder}
          placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
          value={catalogSearch}
          onChangeText={setCatalogSearch}
        />
        {catalogSearch.length > 0 && (
          <TouchableOpacity onPress={() => setCatalogSearch('')}>
            <X size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderModalContent = () => {
    // Step 1: Choose mode
    if (!addMode) {
      return (
        <View className="space-y-3 mt-4">
          <Inspect id="inventory-catalog-btn">
          <TouchableOpacity
            onPress={() => setAddMode('catalog')}
            className={`flex-row items-center p-5 rounded-2xl border ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-4">
              <Tag size={22} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`} style={{ fontSize: 16 * fontSizeScale }}>
                Browse Catalog
              </Text>
              <Text className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`} style={{ fontSize: 12 * fontSizeScale }}>
                Pick from {productCatalog.length || '...'} products — set your own price
              </Text>
            </View>
          </TouchableOpacity>
          </Inspect>

          <Inspect id="inventory-custom-btn">
          <TouchableOpacity
            onPress={() => setAddMode('custom')}
            className={`flex-row items-center p-5 rounded-2xl border ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <View className="w-12 h-12 rounded-full bg-green-100 items-center justify-center mr-4">
              <Package size={22} color="#16a34a" />
            </View>
            <View className="flex-1">
              <Text className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`} style={{ fontSize: 16 * fontSizeScale }}>
                Add Custom Product
              </Text>
              <Text className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`} style={{ fontSize: 12 * fontSizeScale }}>
                Enter name, price, stock, and photo manually
              </Text>
            </View>
          </TouchableOpacity>
          </Inspect>

          <Inspect id="inventory-seed-btn">
          <TouchableOpacity
            onPress={handleSeed}
            className={`flex-row items-center p-5 rounded-2xl border ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <View className="w-12 h-12 rounded-full bg-purple-100 items-center justify-center mr-4">
              <Sparkles size={22} color="#9333ea" />
            </View>
            <View className="flex-1">
              <Text className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`} style={{ fontSize: 16 * fontSizeScale }}>
                Seed All Categories
              </Text>
              <Text className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`} style={{ fontSize: 12 * fontSizeScale }}>
                Guess 1 product per category to fill your inventory
              </Text>
            </View>
          </TouchableOpacity>
          </Inspect>
        </View>
      );
    }

    // Catalog flow
    if (addMode === 'catalog') {
      // Step 3: Set price + stock for selected catalog product
      if (selectedCatalogProduct) {
        return (
          <View>
            {renderSearchBar()}
            <View className={`flex-row items-center p-4 rounded-2xl border mb-4 ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              {selectedCatalogProduct.image_url ? (
                <Image source={{ uri: selectedCatalogProduct.image_url }} className="w-20 h-20 rounded-xl" />
              ) : (
                <View className={`w-20 h-20 rounded-xl items-center justify-center ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <Package size={28} color={isDarkMode ? '#94a3b8' : '#94a3b8'} />
                </View>
              )}
              <View className="flex-1 ml-4">
                <Text className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`} numberOfLines={2} style={{ fontSize: 14 * fontSizeScale }}>
                  {selectedCatalogProduct.name}
                </Text>
                {selectedCatalogProduct.brand && (
                  <Text className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {selectedCatalogProduct.brand}
                  </Text>
                )}
                {selectedCatalogProduct.discount_percent > 0 && (
                  <View className="bg-green-100 rounded px-1.5 py-0.5 mt-1 self-start">
                    <Text className="text-green-700 text-xs font-bold">-{selectedCatalogProduct.discount_percent}% off MRP</Text>
                  </View>
                )}
              </View>
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Your Price (Rs.)</Text>
                <TextInput
                  className={`p-4 rounded-xl border ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  style={{ fontSize: 16 * fontSizeScale, outlineStyle: 'none' }}
                  placeholder={String(selectedCatalogProduct.price || '0')}
                  placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
                  keyboardType="numeric"
                  value={editPrice}
                  onChangeText={setEditPrice}
                />
                {selectedCatalogProduct.marked_price && selectedCatalogProduct.marked_price !== selectedCatalogProduct.price && (
                  <Text className={`text-xs mt-1 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                    MRP: Rs. {selectedCatalogProduct.marked_price}
                  </Text>
                )}
              </View>
              <View className="flex-1">
                <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Stock</Text>
                <TextInput
                  className={`p-4 rounded-xl border ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  style={{ fontSize: 16 * fontSizeScale, outlineStyle: 'none' }}
                  placeholder="0"
                  placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
                  keyboardType="numeric"
                  value={editStock}
                  onChangeText={setEditStock}
                />
              </View>
            </View>

            <TouchableOpacity onPress={handleAddCatalogProduct} className="bg-blue-600 p-5 rounded-2xl items-center shadow-lg mt-4">
              <Text className="text-white font-bold text-lg">Add to Inventory</Text>
            </TouchableOpacity>
          </View>
        );
      }

      // Smart product search across the whole catalog (products only)
      if (catalogResults) {
        return (
          <>
            {renderSearchBar()}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {catalogResults.length === 0 ? (
                <View className="items-center py-12">
                  <Text className={isDarkMode ? 'text-slate-600' : 'text-slate-400'} style={{ fontSize: 14 * fontSizeScale }}>
                    No products match your search
                  </Text>
                </View>
              ) : (
                catalogResults.map(item => renderCatalogProduct({ item, key: item.id }))
              )}
            </ScrollView>
          </>
        );
      }

      // Step 2: Products in category
      if (selectedCategory) {
        return (
          <>
            {renderSearchBar()}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {categoryProducts.length === 0 ? (
                <View className="items-center py-12">
                  <Text className={isDarkMode ? 'text-slate-600' : 'text-slate-400'} style={{ fontSize: 14 * fontSizeScale }}>
                    {catalogSearch ? 'No products match your search' : 'No products in this category'}
                  </Text>
                </View>
              ) : (
                categoryProducts.map(item => renderCatalogProduct({ item, key: item.id }))
              )}
            </ScrollView>
          </>
        );
      }

      // Step 1: Categories (browse only; search already switches to product results)
      return (
        <>
          {renderSearchBar()}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {catalogCategories.length === 0 ? (
              <View className="items-center py-12">
                <Text className={isDarkMode ? 'text-slate-600' : 'text-slate-400'} style={{ fontSize: 14 * fontSizeScale }}>
                  No catalog data
                </Text>
              </View>
            ) : (
              catalogCategories.map(item => renderCategory({ item, key: item }))
            )}
          </ScrollView>
        </>
      );
    }

    // Custom product flow
    if (addMode === 'custom') {
      return (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => pickImage(false)}
            className={`w-full aspect-square rounded-2xl border-2 border-dashed items-center justify-center mb-4 overflow-hidden ${
              isDarkMode ? 'bg-black border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            {newProduct.image ? (
              <Image source={{ uri: newProduct.image }} className="w-full h-full" />
            ) : (
              <View className="items-center">
                <ImageIcon size={48} color={isDarkMode ? '#475569' : '#cbd5e1'} />
                <Text className="text-slate-400 mt-2">Tap to add photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <View className="flex-row gap-3 mb-4">
            <TouchableOpacity
              onPress={() => pickImage(true)}
              className={`flex-1 flex-row p-3 rounded-xl items-center justify-center ${
                isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
              }`}
            >
              <Camera size={18} color={isDarkMode ? '#cbd5e1' : '#475569'} />
              <Text className={`font-bold ml-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => pickImage(false)}
              className={`flex-1 flex-row p-3 rounded-xl items-center justify-center ${
                isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
              }`}
            >
              <ImageIcon size={18} color={isDarkMode ? '#cbd5e1' : '#475569'} />
              <Text className={`font-bold ml-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Gallery</Text>
            </TouchableOpacity>
          </View>

          <View>
            <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Product Name</Text>
            <TextInput
              className={`p-4 rounded-xl border ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
              style={{ fontSize: 14 * fontSizeScale, outlineStyle: 'none' }}
              placeholder="e.g. Fresh Milk"
              placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
              value={newProduct.name}
              onChangeText={(t) => setNewProduct({...newProduct, name: t})}
            />
          </View>

          <View className="flex-row gap-3 mt-4">
            <View className="flex-1">
              <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Price (Rs.)</Text>
              <TextInput
                className={`p-4 rounded-xl border ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                style={{ fontSize: 14 * fontSizeScale, outlineStyle: 'none' }}
                placeholder="0"
                placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
                keyboardType="numeric"
                value={newProduct.price}
                onChangeText={(t) => setNewProduct({...newProduct, price: t})}
              />
            </View>
            <View className="flex-1">
              <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Stock</Text>
              <TextInput
                className={`p-4 rounded-xl border ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                style={{ fontSize: 14 * fontSizeScale, outlineStyle: 'none' }}
                placeholder="0"
                placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
                keyboardType="numeric"
                value={newProduct.stock}
                onChangeText={(t) => setNewProduct({...newProduct, stock: t})}
              />
            </View>
          </View>

          <TouchableOpacity onPress={handleAddCustomProduct} className="bg-blue-600 p-5 rounded-2xl items-center shadow-lg mt-6">
            <Text className="text-white font-bold text-xl">Save Product</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    return null;
  };

  const renderInventorySearch = () => (
    <View className={`px-4 pt-4 pb-2 ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}>
      <View className={`flex-row items-center rounded-xl px-3 py-2.5 border ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <Search size={18} color={isDarkMode ? '#64748b' : '#94a3b8'} />
        <TextInput
          className={`flex-1 ml-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
          style={{ fontSize: 14 * fontSizeScale, outlineStyle: 'none' }}
          placeholder="Search your inventory..."
          placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
          value={invSearch}
          onChangeText={setInvSearch}
        />
        {invSearch.length > 0 && (
          <TouchableOpacity onPress={() => setInvSearch('')}>
            <X size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}>
      {renderInventorySearch()}
      <FlatList
        data={displayedProducts}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 8, paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center pt-24 px-8">
            <Text className={isDarkMode ? 'text-slate-600' : 'text-slate-400'} style={{ fontSize: 16 * fontSizeScale }}>
              {invSearch ? 'No products match your search.' : 'No products yet. Tap + to add one.'}
            </Text>
            {!invSearch && (
              <Inspect id="inventory-empty-seed-btn">
              <TouchableOpacity onPress={handleSeed} className="bg-purple-600 px-6 py-3 rounded-2xl mt-4 flex-row items-center">
                <Sparkles size={18} color="white" />
                <Text className="text-white font-bold ml-2">Guess my stock (1 per category)</Text>
              </TouchableOpacity>
              </Inspect>
            )}
          </View>
        }
      />

      <Inspect id="inventory-add-btn">
        <TouchableOpacity
          className="absolute bottom-40 right-6 bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={28} color="white" />
        </TouchableOpacity>
      </Inspect>

      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <Inspect id="inventory-modal">
        <View className="flex-1 bg-black/80 justify-end">
          <View className={`rounded-t-3xl p-6 h-[85%] ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`} style={{ paddingBottom: insets.bottom + 24 }}>
            {renderStepHeader()}
            <View style={{ flex: 1 }}>
              {renderModalContent()}
            </View>
          </View>
        </View>
        </Inspect>
      </Modal>
    </View>
  );
}
