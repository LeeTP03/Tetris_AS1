import {State, getRandBlock, initialBlockState, initialState, getBlockRotation} from "./main.ts"
export {Tick, MoveLeft, MoveRight, MoveDown, Rotate, BlockSave, ResetBoard, HoldBlock, GameEnd, reduce}
export type {Action}

interface Action {
    apply(s: State): State;
  }

class Tick implements Action{
    constructor(public readonly elapsed: number){}

    apply = (s : State) => {
        return (s.blockState.y + s.blockState.height >= 19) || (Tick.collision(s,0,1))
        ? (new BlockSave().apply(s))
        : {...s,
            level : Math.floor(s.score / 100) + 1,
            time: s.time += 0.5,
        blockState: {
            ...s.blockState,
            y: (s.blockState.y + s.blockState.height >= 19) || (Tick.collision(s,0,1)) ? s.blockState.y : s.blockState.y + 1
            }
        }
    }

    static overlap = (s : State, new_coords : { x:number, y:number }[] | null = null) => {
        let truelist : boolean[] = [];
        new_coords == null 
        ? s.blockState.blockCoords.map((coord) => {s.allCoords.map((coord2) => {coord.x == coord2.x && coord.y == coord2.y ? truelist.push(true) : truelist.push(false)})})
        : (new_coords.map((coord) => {s.allCoords.map((coord2) => {(coord.x == coord2.x && coord.y == coord2.y) ? truelist.push(true) : truelist.push(false)})}),
          new_coords.map((coord) => {coord.x < 0 || coord.x > 9 || coord.y > 19 ? truelist.push(true) : truelist.push(false)}) )
        return truelist.includes(true)
    }

    static collision = (s : State, x_amount: number, y_amount: number) => {
        let truelist : boolean[] = [];
        s.blockState.blockCoords.map((coord) => {truelist.push(Tick.checkCoordinate(s, coord.x + x_amount, coord.y + y_amount))})
        return truelist.includes(true)
    }

    static checkCoordinate = (s : State, coord_x : number, coord_y : number) => {
        let truelist : boolean[] = [];
        s.allCoords.map((coord) => {coord.x == coord_x && coord.y == coord_y ? truelist.push(true) : truelist.push(false)})
        return truelist.includes(true)
    }
    

    static aboveBoard = (s : State) => {
        s.blockState.blockCoords.map((coord) => {coord.y < 0 ? s.gameEnd = true : s.gameEnd = s.gameEnd})
    }

    static checkRowFull = (s : State) => {
        let truelist: {[key:number] : number } = {};
        s.allCoords.map((coord) => {truelist[coord.y] == null ? truelist[coord.y] = 1 : truelist[coord.y] == 10 ? truelist[coord.y] == 0 : truelist[coord.y] += 1})
        return truelist
    }

    static removeRow = (s : State, row: number) => {
        let new_coords = s.allCoords.filter((coord) => coord.y != row)
        new_coords.map((coords) => {coords.y < row ? coords.y += 1 : coords.y = coords.y})
        s.score += 100
        return new_coords
    }


}

class MoveLeft implements Action{
    apply = (s : State) => ({
        ...s,
        blockState: {
            ...s.blockState,
            x: (s.blockState.x - s.blockState.leftWidth < -1) || (Tick.collision(s,-1,0)) ? s.blockState.x : s.blockState.x - 1
        }
    })
}

class MoveRight implements Action{
    apply = (s : State) => ({
        ...s,
        blockState: {
            ...s.blockState,
            x: (s.blockState.x + s.blockState.rightWidth > 8) || (Tick.collision(s,1,0)) ? s.blockState.x : s.blockState.x + 1
        }
    })
}

class MoveDown implements Action{
    apply = (s : State) => {
        return (s.blockState.y + s.blockState.height >= 19) || (Tick.collision(s,0,1)) ? new BlockSave().apply(s) : {...s,
        blockState: {
            ...s.blockState,
            y: (s.blockState.y + s.blockState.height >= 19) || (Tick.collision(s,0,1)) ? s.blockState.y : s.blockState.y + 1
            }
        }
    }
}

class Rotate implements Action{
    apply = (s : State) => { 
        const blockRotation = getBlockRotation(s.blockState.type)
        const nextRotation = blockRotation[(s.blockState.rotation + 1) % blockRotation.length]
        const newCoords = nextRotation.map((coord) => ({x: coord.x + s.blockState.x, y: coord.y + s.blockState.y}))
        return {
        ...s,
        blockState: {
            ...s.blockState,
            rotation: Tick.overlap(s, newCoords) ? s.blockState.rotation : s.blockState.rotation + 1
        }
    }}
}

class BlockSave implements Action{
    apply = (s : State) => {
        s.blockState.blockCoords.map((coord) => {s.allCoords.push({x:coord.x, y:coord.y, color: s.blockState.color})});
        
        return {
        ...s,
        blockState: {...s.blockState,
            x:4,
            y:-1,
            rotation:0,
            type: s.nextBlock,
        },
        nextBlock : getRandBlock()
    }}
}

class ResetBoard implements Action{
    apply(s: State): State {
        return {
            ...s,
            allCoords : [],
            blockState: {...initialBlockState,
                type : getRandBlock(),},
            score : 0,
            level : 1,
            time : 0,
            gameEnd : false,
            nextBlock : getRandBlock(),
            holdBlock : getRandBlock(),

        }
    }
}

class HoldBlock implements Action{
    apply(s: State): State {

        const new_coords = getBlockRotation(s.holdBlock)[0].map((coord) => ({x: coord.x + s.blockState.x, y: coord.y + s.blockState.y}))
        return Tick.overlap(s, new_coords) 
        ? s 
        : {...s,
            blockState: {...s.blockState,
            type : s.holdBlock,
        }
        ,
        holdBlock : s.blockState.type,
            
        }
    }
}

class GameEnd implements Action{
    apply(s: State): State {
        return {...s,
            gameEnd : true,
        }
    }
}

const reduce = (s: State, a: Action): State => a.apply(s);