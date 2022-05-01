export var MapType;
(function (MapType) {
    MapType[MapType["THE_SKELD"] = 0] = "THE_SKELD";
    MapType[MapType["MIRA_HQ"] = 1] = "MIRA_HQ";
    MapType[MapType["POLUS"] = 2] = "POLUS";
    MapType[MapType["THE_SKELD_APRIL"] = 3] = "THE_SKELD_APRIL";
    MapType[MapType["AIRSHIP"] = 4] = "AIRSHIP";
    MapType[MapType["SUBMERGED"] = 5] = "SUBMERGED";
    MapType[MapType["UNKNOWN"] = 6] = "UNKNOWN";
})(MapType || (MapType = {}));
export var CameraLocation;
(function (CameraLocation) {
    CameraLocation[CameraLocation["East"] = 0] = "East";
    CameraLocation[CameraLocation["Central"] = 1] = "Central";
    CameraLocation[CameraLocation["Northeast"] = 2] = "Northeast";
    CameraLocation[CameraLocation["South"] = 3] = "South";
    CameraLocation[CameraLocation["SouthWest"] = 4] = "SouthWest";
    CameraLocation[CameraLocation["NorthWest"] = 5] = "NorthWest";
    CameraLocation[CameraLocation["Skeld"] = 6] = "Skeld";
    CameraLocation[CameraLocation["NONE"] = 7] = "NONE";
})(CameraLocation || (CameraLocation = {}));
const defaultMap = {
    cameras: {},
};
export const AmongUsMaps = {
    [MapType.THE_SKELD]: {
        cameras: {
            [0]: { x: 13.2417, y: -4.348 },
            [1]: { x: 0.6216, y: -6.5642 },
            [2]: { x: -7.1503, y: 1.6709 },
            [3]: { x: -17.8098, y: -4.8983 },
        },
    },
    [MapType.POLUS]: {
        cameras: {
            [CameraLocation.East]: { x: 29, y: -15.7 },
            [CameraLocation.Central]: { x: 15.4, y: -15.4 },
            [CameraLocation.Northeast]: { x: 24.4, y: -8.5 },
            [CameraLocation.South]: { x: 17, y: -20.6 },
            [CameraLocation.SouthWest]: { x: 4.7, y: -22.73 },
            [CameraLocation.NorthWest]: { x: 11.6, y: -8.2 },
        },
    },
    [MapType.THE_SKELD_APRIL]: defaultMap,
    [MapType.MIRA_HQ]: defaultMap,
    [MapType.AIRSHIP]: {
        cameras: {
            [CameraLocation.East]: { x: -8.2872, y: 0.0527 },
            [CameraLocation.Central]: { x: -4.0477, y: 9.1447 },
            [CameraLocation.Northeast]: { x: 23.5616, y: 9.8882 },
            [CameraLocation.South]: { x: 4.881, y: -11.1688 },
            [CameraLocation.SouthWest]: { x: 30.3702, y: -0.874 },
            [CameraLocation.NorthWest]: { x: 3.3018, y: 16.2631 }, // MEETING ROOM
        },
    },
    [MapType.SUBMERGED]: {
        cameras: {},
    },
    [MapType.UNKNOWN]: defaultMap,
};
// East: 29, -15.7
// Central: 15.4, -15.4
// Northeast: 24.4, -8.5
// South: 17, -20.6
// Southwest: 4.7, -22.73
// Northwest: 11.6, -8.2
//# sourceMappingURL=AmongusMap.js.map