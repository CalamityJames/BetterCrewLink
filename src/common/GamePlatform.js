export var GamePlatform;
(function (GamePlatform) {
    GamePlatform["EPIC"] = "EPIC";
    GamePlatform["STEAM"] = "STEAM";
    GamePlatform["MICROSOFT"] = "MICROSOFT";
})(GamePlatform || (GamePlatform = {}));
export var PlatformRunType;
(function (PlatformRunType) {
    PlatformRunType["URI"] = "URI";
    PlatformRunType["EXE"] = "EXE";
})(PlatformRunType || (PlatformRunType = {}));
export const DefaultGamePlatforms = {
    [GamePlatform.STEAM]: {
        default: true,
        key: GamePlatform.STEAM,
        launchType: PlatformRunType.URI,
        runPath: 'steam://rungameid/945360',
        execute: [''],
        translateKey: 'platform.steam',
    },
    [GamePlatform.EPIC]: {
        default: true,
        key: GamePlatform.EPIC,
        launchType: PlatformRunType.URI,
        runPath: 'com.epicgames.launcher://apps/963137e4c29d4c79a81323b8fab03a40?action=launch&silent=true',
        execute: [''],
        translateKey: 'platform.epicgames',
    },
    [GamePlatform.MICROSOFT]: {
        default: true,
        key: GamePlatform.MICROSOFT,
        launchType: PlatformRunType.EXE,
        runPath: 'none',
        execute: ['Among Us.exe'],
        translateKey: 'platform.microsoft',
    },
};
//# sourceMappingURL=GamePlatform.js.map