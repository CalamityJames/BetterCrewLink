import React, { useMemo } from 'react';
import { getCosmetic, redAlive, cosmeticType, getHatDementions, initializedHats as initializedHats, initializeHats, } from './cosmetics';
import makeStyles from '@material-ui/core/styles/makeStyles';
import MicOff from '@material-ui/icons/MicOff';
import VolumeOff from '@material-ui/icons/VolumeOff';
import WifiOff from '@material-ui/icons/WifiOff';
import LinkOff from '@material-ui/icons/LinkOff';
import ErrorOutline from '@material-ui/icons/ErrorOutline'; //@ts-ignore
import RadioSVG from '../../static/radio.svg';
// import Tooltip from '@material-ui/core/Tooltip';
import Tooltip from 'react-tooltip-lite';
import Slider from '@material-ui/core/Slider';
import VolumeUp from '@material-ui/icons/VolumeUp';
import IconButton from '@material-ui/core/IconButton';
import Grid from '@material-ui/core/Grid';
const useStyles = makeStyles(() => ({
    canvas: {
        position: 'absolute',
        width: '100%',
    },
    icon: {
        background: '#ea3c2a',
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        border: '2px solid #690a00',
        borderRadius: '50%',
        padding: 2,
        zIndex: 10,
    },
    iconNoBackground: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        padding: 2,
        zIndex: 10,
    },
    relative: {
        position: 'relative',
    },
    slidecontainer: {
        minWidth: '80px',
    },
    innerTooltip: {
        textAlign: 'center',
    },
}));
const Avatar = function ({ talking, deafened, muted, borderColor, isAlive, player, size, connectionState, socketConfig, showborder, showHat, isUsingRadio, lookLeft = false, overflow = false, onConfigChange, mod, }) {
    const classes = useStyles();
    let icon;
    deafened = deafened === true || (socketConfig === null || socketConfig === void 0 ? void 0 : socketConfig.isMuted) === true || (socketConfig === null || socketConfig === void 0 ? void 0 : socketConfig.volume) === 0;
    switch (connectionState) {
        case 'connected':
            if (deafened) {
                icon = React.createElement(VolumeOff, { className: classes.icon });
            }
            else if (muted) {
                icon = React.createElement(MicOff, { className: classes.icon });
            }
            break;
        case 'novoice':
            icon = React.createElement(LinkOff, { className: classes.icon, style: { background: '#e67e22', borderColor: '#694900' } });
            break;
        case 'disconnected':
            icon = React.createElement(WifiOff, { className: classes.icon });
            break;
    }
    if (player.bugged) {
        icon = React.createElement(ErrorOutline, { className: classes.icon, style: { background: 'red', borderColor: '' } });
    }
    const canvas = (React.createElement(Canvas, { className: classes.canvas, color: player.colorId, hat: showHat === false ? '' : player.hatId, visor: showHat === false ? '' : player.visorId, skin: player.skinId, isAlive: isAlive, lookLeft: lookLeft === true, borderColor: talking ? borderColor : showborder === true ? '#ccbdcc86' : 'transparent', size: size, overflow: overflow, usingRadio: isUsingRadio, mod: mod }));
    if (socketConfig) {
        let muteButtonIcon;
        if (socketConfig.isMuted) {
            muteButtonIcon = React.createElement(VolumeOff, { color: "primary", className: classes.iconNoBackground });
        }
        else {
            muteButtonIcon = React.createElement(VolumeUp, { color: "primary", className: classes.iconNoBackground });
        }
        return (React.createElement(Tooltip, { mouseOutDelay: 300, content: React.createElement("div", { className: classes.innerTooltip },
                React.createElement("b", null, player.name),
                React.createElement(Grid, { container: true, spacing: 0, className: classes.slidecontainer },
                    React.createElement(Grid, { item: true },
                        React.createElement(IconButton, { onClick: () => {
                                socketConfig.isMuted = !socketConfig.isMuted;
                            }, style: { margin: '1px 1px 0px 0px' } }, muteButtonIcon)),
                    React.createElement(Grid, { item: true, xs: true },
                        React.createElement(Slider, { value: socketConfig.volume, min: 0, max: 2, step: 0.02, onChange: (_, newValue) => {
                                socketConfig.volume = newValue;
                            }, valueLabelDisplay: 'auto', valueLabelFormat: (value) => Math.floor(value * 100) + '%', onMouseLeave: () => {
                                if (onConfigChange) {
                                    onConfigChange();
                                }
                            }, "aria-labelledby": "continuous-slider" })))), padding: 5 },
            canvas,
            icon));
    }
    else {
        return (React.createElement("div", { className: classes.relative },
            canvas,
            icon));
    }
};
const useCanvasStyles = makeStyles(() => ({
    base: {
        width: '105%',
        position: 'absolute',
        top: '22%',
        left: ({ paddingLeft }) => paddingLeft,
        zIndex: 2,
    },
    hat: {
        pointerEvents: 'none',
        width: ({ dementions }) => dementions.hat.width,
        position: 'absolute',
        top: ({ dementions }) => `calc(22% + ${dementions.hat.top})`,
        left: ({ size, paddingLeft, dementions }) => `calc(${dementions.hat.left} + ${Math.max(2, size / 40) / 2 + paddingLeft}px)`,
        zIndex: 4,
        display: ({ isAlive }) => (isAlive ? 'block' : 'none'),
    },
    skin: {
        pointerEvents: 'none',
        width: ({ dementions }) => dementions.skin.width,
        position: 'absolute',
        top: ({ dementions }) => `calc(22% + ${dementions.skin.top})`,
        left: ({ size, paddingLeft, dementions }) => `calc(${dementions.skin.left} + ${Math.max(2, size / 40) / 2 + paddingLeft}px)`,
        zIndex: 3,
        display: ({ isAlive }) => (isAlive ? 'block' : 'none'),
    },
    visor: {
        pointerEvents: 'none',
        width: ({ dementions }) => dementions.visor.width,
        position: 'absolute',
        top: ({ dementions }) => `calc(22% + ${dementions.visor.top})`,
        left: ({ size, paddingLeft, dementions }) => `calc(${dementions.visor.left} + ${Math.max(2, size / 40) / 2 + paddingLeft}px)`,
        zIndex: 3,
        display: ({ isAlive }) => (isAlive ? 'block' : 'none'),
    },
    avatar: {
        // overflow: 'hidden',
        borderRadius: '50%',
        position: 'relative',
        borderStyle: 'solid',
        transition: 'border-color .2s ease-out',
        borderColor: ({ borderColor }) => borderColor,
        borderWidth: ({ size }) => Math.max(2, size / 40),
        transform: ({ lookLeft }) => (lookLeft ? 'scaleX(-1)' : 'scaleX(1)'),
        width: '100%',
        paddingBottom: '100%',
        cursor: 'pointer',
    },
    radio: {
        position: 'absolute',
        left: '70%',
        top: '80%',
        width: '30px',
        transform: 'translate(-50%, -50%)',
        fill: 'white',
        padding: 2,
        zIndex: 12,
    },
}));
function Canvas({ hat, skin, visor, isAlive, lookLeft, size, borderColor, color, overflow, usingRadio, onClick, mod, }) {
    const hatImg = useMemo(() => {
        if (!initializedHats) {
            initializeHats();
        }
        return {
            base: getCosmetic(color, isAlive, cosmeticType.base),
            hat_front: !initializedHats ? '' : getCosmetic(color, isAlive, cosmeticType.hat, hat, mod),
            hat_back: !initializedHats ? '' : getCosmetic(color, isAlive, cosmeticType.hat_back, hat, mod),
            skin: !initializedHats ? '' : getCosmetic(color, isAlive, cosmeticType.hat, skin, mod),
            visor: !initializedHats ? '' : getCosmetic(color, isAlive, cosmeticType.hat, visor, mod),
            dementions: {
                hat: getHatDementions(hat, mod),
                visor: getHatDementions(visor, mod),
                skin: getHatDementions(skin, mod),
            },
        };
    }, [color, hat, skin, visor, initializedHats, isAlive]);
    const classes = useCanvasStyles({
        isAlive,
        dementions: hatImg.dementions,
        lookLeft,
        size,
        borderColor,
        paddingLeft: -7,
    });
    //@ts-ignore
    const onerror = (e) => {
        e.target.style.display = 'none';
    };
    //@ts-ignore
    const onload = (e) => {
        e.target.style.display = '';
    };
    const hatElement = (React.createElement(React.Fragment, null,
        React.createElement("img", { src: hatImg.hat_front, className: classes.hat, onError: onerror, onLoad: onload }),
        React.createElement("img", { src: hatImg.visor, className: classes.visor, onError: onerror, onLoad: onload }),
        React.createElement("img", { src: hatImg.hat_back, className: classes.hat, style: { zIndex: 1 }, onError: onerror, onLoad: onload })));
    return (React.createElement(React.Fragment, null,
        React.createElement("div", { className: classes.avatar, onClick: onClick },
            React.createElement("div", { className: classes.avatar, style: {
                    overflow: 'hidden',
                    position: 'absolute',
                    top: Math.max(2, size / 40) * -1,
                    left: Math.max(2, size / 40) * -1,
                    transform: 'unset',
                } },
                React.createElement("img", { src: hatImg.base, className: classes.base, 
                    //@ts-ignore
                    onError: (e) => {
                        e.target.onError = null;
                        e.target.src = redAlive;
                    } }),
                React.createElement("img", { src: hatImg.skin, className: classes.skin, onError: onerror, onLoad: onload }),
                overflow && hatElement),
            !overflow && hatElement,
            usingRadio && React.createElement("img", { src: RadioSVG, className: classes.radio }))));
}
export default Avatar;
//# sourceMappingURL=Avatar.js.map