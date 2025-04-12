/* This file defines the bird that is used in the Flappy game */

import Matter from 'matter-js'
import React from 'react'
import { View } from 'react-native';

const Floor = props => {
    //set the width and length for the bird
    const widthBody = props.body.bounds.max.x - props.body.bounds.min.x
    const heightBody = props.body.bounds.max.y - props.body.bounds.min.y

    //set position of bird based on middle of width and height
    const xBody = props.body.position.x - (widthBody / 2)
    const yBody = props.body.position.y - (heightBody / 2)

    //set color of bird
    const color = props.color;

    return (
        <View style={{
            backgroundColor: color,
            position: 'absolute',
            left: xBody,
            top: yBody,
            width: widthBody,
            height: heightBody
        }} />
    )
}


export default (world, color, pos, size) => {
    const initialFloor = Matter.Bodies.rectangle(
        pos.x,
        pos.y,
        size.width,
        size.height,
        { 
            label: 'Floor', 
            isStatic: true
        }
    )
    Matter.World.add(world, initialFloor)

    return {
        body: initialFloor,
        color,
        pos,
        renderer: <Floor body={initialFloor} color={color} />
    }
}