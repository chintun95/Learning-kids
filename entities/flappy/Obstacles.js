/* This file defines the Obstacle that is used in the Flappy game */

import Matter from 'matter-js'
import React from 'react'
import { View } from 'react-native';

const Obstacle = props => {
    //set the width and length for the Obstacle
    const widthBody = props.body.bounds.max.x - props.body.bounds.min.x
    const heightBody = props.body.bounds.max.y - props.body.bounds.min.y

    //set position of Obstacle based on middle of width and height
    const xBody = props.body.position.x - (widthBody / 2)
    const yBody = props.body.position.y - (heightBody / 2)

    //set color of Obstacle
    const color = props.color;

    return (
        <View style={{
            borderWidth: 1,
            borderColor: color,
            borderStyle: 'solid',
            position: 'absolute',
            left: xBody,
            top: yBody,
            width: widthBody,
            height: heightBody
        }} />
    )
}


export default (world, label, color, pos, size) => {
    const initialObstacle = Matter.Bodies.rectangle(
        pos.x,
        pos.y,
        size.width,
        size.height,
        {
            label,
            isStatic: true
        }
    )
    Matter.World.add(world, initialObstacle)

    return {
        body: initialObstacle,
        color,
        pos,
        renderer: <Obstacle body={initialObstacle} color={color} />
    }
}