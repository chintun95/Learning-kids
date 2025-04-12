/* Index for functions used in the flappy game */

import Matter from "matter-js"
import Bird from "./Bird";
import Floor from "./Floor";
import Obstacle from "./Obstacles";
import {getPipeSizePosPair} from "../../utils/random";
import {Dimensions} from 'react-native'

const windowHeight = Dimensions.get('window').height
const windowWidth = Dimensions.get('window').width

/* Function for restarting a game */
export default function flappy_restart () {

    //enableSleeping improves efficiency at cost of accuracy
    const engine = Matter.Engine.create({enableSleeping: false}) 

    //define world for the engine
    const world = engine.world;

    //set gravity for engine
    engine.gravity.y = 0.4;

    const pipeSizePosA = getPipeSizePosPair()
    const pipeSizePosB = getPipeSizePosPair(windowWidth * 0.9)

    return {
        physics: {engine, world},

        Bird: Bird(world, 'blue', {x: 50, y: 400}, {height: 40, width: 40}),

        ObstacleTop1: Obstacle(world, 'ObstacleTop1', 'orange', pipeSizePosA.pipeTop.pos, pipeSizePosA.pipeTop.size),
        ObstacleBottom1: Obstacle(world, 'ObstacleBottom1', 'green', pipeSizePosA.pipeBottom.pos, pipeSizePosA.pipeBottom.size),
        ObstacleTop2: Obstacle(world, 'ObstacleTop2', 'orange', pipeSizePosB.pipeTop.pos, pipeSizePosB.pipeTop.size),
        ObstacleBottom2: Obstacle(world, 'ObstacleBottom2', 'green', pipeSizePosB.pipeBottom.pos, pipeSizePosB.pipeBottom.size),


        Floor: Floor(world, 'blue', {x: windowWidth / 2, y: windowHeight}, {height: 175, width: windowWidth})
    }
}