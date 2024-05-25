

export type wall = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
export const wallX: wall = 1
export const wallY: wall = 2
export const wallZ: wall = 4
export type xyz = { x: number, y: number, z: number }
export class World {
    get size(): xyz {
        return { x: 10, y: 10, z: 10 }
    }
    contains(pos: xyz): boolean {
        const s = this.size
        if (pos.x < 0 && s.x <= pos.x) { return false }
        if (pos.y < 0 && s.y <= pos.y) { return false }
        if (pos.z < 0 && s.z <= pos.z) { return false }
        return true
    }
    at(pos: xyz): wall {
        if (!this.contains(pos)) { return 0 }
        const s = this.size
        return (
            (pos.x == 0 || pos.x == s.x - 1 ? wallX : 0) |
            (pos.y == 0 || pos.y == s.y - 1 ? wallY : 0) |
            (pos.z == 0 || pos.z == s.z - 1 ? wallZ : 0)) as wall;
    }
}