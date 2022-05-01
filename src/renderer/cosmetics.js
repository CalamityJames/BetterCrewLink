// @ts-ignore
import redAliveimg from '../../static/images/avatar/placeholder.png'; // @ts-ignore
import rainbowAliveimg from '../../static/images/avatar/rainbow-alive.png'; // @ts-ignore
import rainbowDeadeimg from '../../static/images/avatar/rainbow-dead.png';
export const redAlive = redAliveimg;
export var cosmeticType;
(function (cosmeticType) {
    cosmeticType[cosmeticType["base"] = 0] = "base";
    cosmeticType[cosmeticType["hat"] = 1] = "hat";
    cosmeticType[cosmeticType["hat_back"] = 2] = "hat_back";
})(cosmeticType || (cosmeticType = {}));
let hatCollection = {};
let requestingHats = false;
export var initializedHats = false;
export function initializeHats() {
    if (initializedHats || requestingHats) {
        return;
    }
    requestingHats = true;
    fetch(`${HAT_COLLECTION_URL}/hats.json`)
        .then((response) => response.json())
        .then((data) => {
        hatCollection = data;
        initializedHats = true;
    });
    return undefined;
}
const HAT_COLLECTION_URL = 'https://raw.githubusercontent.com/OhMyGuus/BetterCrewlink-Hats/master';
function getModHat(color, id = '', mod, back = false) {
    if (!initializedHats) {
        return '';
    }
    const hatBase = getHat(id, mod);
    const hat = back ? hatBase === null || hatBase === void 0 ? void 0 : hatBase.back_image : hatBase === null || hatBase === void 0 ? void 0 : hatBase.image;
    const multiColor = hatBase === null || hatBase === void 0 ? void 0 : hatBase.multi_color;
    if (hat && hatBase) {
        if (!multiColor)
            return `${HAT_COLLECTION_URL}/${hatBase.mod}/${hat}`;
        else
            return `generate:///${HAT_COLLECTION_URL}/${hatBase.mod}/${hat}?color=${color}`;
    }
    return undefined;
}
function getHat(id, modType) {
    var _a, _b, _c;
    if (!initializedHats) {
        return undefined;
    }
    for (const mod of ['NONE', modType]) {
        const modHatList = hatCollection[mod];
        const hat = modHatList === null || modHatList === void 0 ? void 0 : modHatList.hats[id];
        if (hat) {
            hat.top = (_a = hat === null || hat === void 0 ? void 0 : hat.top) !== null && _a !== void 0 ? _a : modHatList === null || modHatList === void 0 ? void 0 : modHatList.defaultTop;
            hat.width = (_b = hat === null || hat === void 0 ? void 0 : hat.width) !== null && _b !== void 0 ? _b : modHatList === null || modHatList === void 0 ? void 0 : modHatList.defaultWidth;
            hat.left = (_c = hat === null || hat === void 0 ? void 0 : hat.left) !== null && _c !== void 0 ? _c : modHatList === null || modHatList === void 0 ? void 0 : modHatList.defaultLeft;
            hat.mod = mod;
            return hat;
        }
    }
    return undefined;
}
export function getHatDementions(id, mod) {
    var _a, _b, _c;
    const hat = getHat(id, mod);
    return {
        top: (_a = hat === null || hat === void 0 ? void 0 : hat.top) !== null && _a !== void 0 ? _a : '0',
        width: (_b = hat === null || hat === void 0 ? void 0 : hat.width) !== null && _b !== void 0 ? _b : '0',
        left: (_c = hat === null || hat === void 0 ? void 0 : hat.left) !== null && _c !== void 0 ? _c : '0',
    };
}
export const RainbowColorId = -99234;
export function getCosmetic(color, isAlive, type, id = '', mod = 'NONE') {
    if (type === cosmeticType.base) {
        if (color == RainbowColorId) {
            return isAlive ? rainbowAliveimg : rainbowDeadeimg;
        }
        return `static:///generated/${isAlive ? `player` : `ghost`}/${color}.png`;
    }
    else {
        const modHat = getModHat(color, id, mod, type === cosmeticType.hat_back);
        if (modHat)
            return modHat;
    }
    return '';
}
//# sourceMappingURL=cosmetics.js.map