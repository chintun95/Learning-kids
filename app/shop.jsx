import React, { memo } from 'react';
import { StyleSheet, Text, View, ImageBackground, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useFonts } from "expo-font";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import shopBg from '@/assets/images/app-background.png';

const shopItems = [
  { id: '1', name: 'Fire Helmet', price: 100, image: require('@/assets/images/fire-helmet.png') },
  { id: '2', name: 'Police Badge', price: 150, image: require('@/assets/images/police-badge.png') },
  { id: '3', name: 'Doctor Kit', price: 200, image: require('@/assets/images/doctor-kit.png') },
];

const ShopPage = memo(() => {
  const [fontsLoaded] = useFonts({
    "FredokaOne-Regular": require("@/assets/fonts/FredokaOne-Regular.ttf"),
  });

  if (!fontsLoaded) return <Text>Loading fonts...</Text>;

  const handlePurchase = (item) => {
    Alert.alert('Purchase', `You bought ${item.name} for ${item.price} coins!`);
    // purchase logic add later
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <Image source={item.image} style={styles.itemImage} />
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.itemPrice}>{item.price} coins</Text>
      <TouchableOpacity onPress={() => handlePurchase(item)} style={styles.buyButton}>
        <Text style={styles.buyText}>Buy</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground source={shopBg} resizeMode="cover" style={styles.background} />

      <Text style={styles.header}>Shop</Text>

      <FlatList
        data={shopItems}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  background: {
    position: 'absolute',
    width: wp('100%'),
    height: hp('100%'),
  },
  header: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('10%'),
    color: '#1E1E1E',
    marginTop: hp('5%'),
  },
  listContainer: {
    marginTop: hp('2%'),
    paddingBottom: hp('10%'),
    alignItems: 'center',
  },
  itemContainer: {
    width: wp('80%'),
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000',
    padding: 20,
    marginVertical: 10,
    alignItems: 'center',
  },
  itemImage: {
    width: wp('30%'),
    height: wp('30%'),
    marginBottom: 10,
  },
  itemName: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('5%'),
    color: '#000',
    marginBottom: 5,
  },
  itemPrice: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4%'),
    color: '#333',
    marginBottom: 10,
  },
  buyButton: {
    backgroundColor: '#D9D9D9',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buyText: {
    fontFamily: 'FredokaOne-Regular',
    fontSize: wp('4.5%'),
    color: '#000',
  },
});

export default ShopPage;
