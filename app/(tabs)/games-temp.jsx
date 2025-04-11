import React, { useState, memo } from 'react'
import { StyleSheet, Text, View, ImageBackground,PixelRatio, TextInput,
   Pressable,TouchableOpacity, ActivityIndicator } from 'react-native'
import loginImage from "@/assets/images/app-background.png"
import { Link } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from "expo-font"
import { MaterialIcons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const GamesTemp = memo(() => {

    //using font from index, show message while loading fonts
    const [fontsLoaded] = useFonts({
        "FredokaOne-Regular": require("@/assets/fonts/FredokaOne-Regular.ttf"), 
    });

    if(!fontsLoaded){
        return <Text> Loading fonts...</Text>;
    }

    return(
        <SafeAreaView style={styles.container}>
           {/* Page Text */}
           <Text style={styles.text}>Select a Game!</Text>

            {/* Game Icon Container */}
            <Text style={styles.otherText1}>Games</Text>
            <View style={styles.iconContainer}>
                <Link href="/" asChild>
                    <Pressable>
                        <Image source={require("@/assets/images/kiwi.png")} style={styles.icon}/>

                {/* Add more game icons here */}

                    </Pressable>
                </Link>
            </View>
            

        </SafeAreaView>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      },
      text: {
        position: 'absolute',
        top: hp('30%'),
        textAlign: 'center',
        color: '#1E1E1E',
        fontSize: wp('12%'), // Scales with screen size
        fontFamily: 'FredokaOne-Regular',
      },
      otherText1: {
        position: 'absolute',
        top: hp('80%'),
        textAlign: 'center',
        color: '#0A0A0A',
        fontSize: wp('3.8%'), // Scales with screen size
        fontFamily: 'FredokaOne-Regular',
      },
      iconContainer:{
        position: 'absolute',
        top: hp('81%'),
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 25,
      },
      icon:{
        width: 60,
        height: 60,
        marginHorizontal: 15,
      }

});

export default GamesTemp;