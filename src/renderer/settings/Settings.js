import Store from 'electron-store';
import React, { useCallback, useContext, useEffect, useReducer, useState } from 'react';
import { SettingsContext, LobbySettingsContext, GameStateContext } from '../contexts';
import MicrophoneSoundBar from './MicrophoneSoundBar';
import TestSpeakersButton from './TestSpeakersButton';
import makeStyles from '@material-ui/core/styles/makeStyles';
import withStyles from '@material-ui/core/styles/withStyles';
import { Grid, RadioGroup, Checkbox, FormControlLabel, Box, Typography, IconButton, Button, Radio, } from '@material-ui/core';
import { DialogContent, DialogContentText, DialogActions, DialogTitle, Slider, Tooltip } from '@material-ui/core';
import { Dialog, TextField } from '@material-ui/core';
import ChevronLeft from '@material-ui/icons/ArrowBack';
import Alert from '@material-ui/lab/Alert';
import { GameState } from '../../common/AmongUsState';
import { app, ipcRenderer } from 'electron';
import { IpcHandlerMessages } from '../../common/ipc-messages';
import i18next from 'i18next';
import languages from '../language/languages';
import ServerURLInput from './ServerURLInput';
import MuiDivider from '@material-ui/core/Divider';
import PublicLobbySettings from './PublicLobbySettings';
import { GamePlatform } from '../../common/GamePlatform';
const Divider = withStyles((theme) => ({
    root: {
        width: '100%',
        marginTop: theme.spacing(2),
        marginBottom: theme.spacing(2),
    },
}))(MuiDivider);
const useStyles = makeStyles((theme) => ({
    root: {
        width: '100vw',
        height: `calc(100vh - ${theme.spacing(3)}px)`,
        background: '#171717ad',
        backdropFilter: 'blur(4px)',
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: 99,
        alignItems: 'center',
        marginTop: theme.spacing(3),
        transition: 'transform .1s ease-in-out',
        WebkitAppRegion: 'no-drag',
        transform: ({ open }) => (open ? 'translateX(0)' : 'translateX(-100%)'),
    },
    header: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: 40,
    },
    scroll: {
        paddingTop: theme.spacing(1),
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(2),
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'start',
        alignItems: 'center',
        paddingBottom: theme.spacing(7),
        height: `calc(100vh - 40px - ${theme.spacing(7 + 3 + 3)}px)`,
    },
    shortcutField: {
        marginTop: theme.spacing(1),
    },
    back: {
        cursor: 'pointer',
        position: 'absolute',
        right: theme.spacing(1),
        WebkitAppRegion: 'no-drag',
    },
    alert: {
        position: 'absolute',
        bottom: theme.spacing(1),
        zIndex: 10,
    },
    dialog: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'start',
        '&>*': {
            marginBottom: theme.spacing(1),
        },
    },
    formLabel: {
        width: '100%',
        borderTop: '1px solid #313135',
        marginRight: '0px',
        // paddingBottom:'5px'
    },
}));
const keys = new Set([
    'CapsLock',
    'Space',
    'Backspace',
    'Delete',
    'Enter',
    'Up',
    'Down',
    'Left',
    'Right',
    'Home',
    'End',
    'PageUp',
    'PageDown',
    'Escape',
    'LShift',
    'RShift',
    'RAlt',
    'LAlt',
    'RControl',
    'LControl',
]);
export var pushToTalkOptions;
(function (pushToTalkOptions) {
    pushToTalkOptions[pushToTalkOptions["VOICE"] = 0] = "VOICE";
    pushToTalkOptions[pushToTalkOptions["PUSH_TO_TALK"] = 1] = "PUSH_TO_TALK";
    pushToTalkOptions[pushToTalkOptions["PUSH_TO_MUTE"] = 2] = "PUSH_TO_MUTE";
})(pushToTalkOptions || (pushToTalkOptions = {}));
const store = new Store({
    migrations: {
        '2.0.6': (store) => {
            if (store.get('serverURL') === 'http://bettercrewl.ink' ||
                store.get('serverURL') === 'https://bettercrewlink.app' ||
                store.get('serverURL') === 'http://bettercrewlink.app' ||
                store.get('serverURL') === 'https://bettercrewlink.app/' ||
                store.get('serverURL') === 'http://bettercrewlink.app/' ||
                store.get('serverURL') === 'https://bettercrewl.ink:6523' ||
                store.get('serverURL') === 'http://bettercrewl.ink:6523' ||
                store.get('serverURL') === 'https://crewlink.guus.info' ||
                store.get('serverURL') === 'http://crewlink.guus.info' ||
                store.get('serverURL') === 'https://crewlink.guus.ninja' ||
                store.get('serverURL') === 'http://crewlink.guus.ninja' ||
                store.get('serverURL') === 'https://github.com/OhMyGuus/BetterCrewLink' ||
                store.get('serverURL') === 'https://mirror.bettercrewl.ink' ||
                store.get('serverURL') === 'https://mirror.bettercrewl.ink/' ||
                store.get('serverURL') === 'https://www.curseforge.com/among-us/all-mods/bettercrewlink-proximity-chat' ||
                store.get('serverURL') === 'https://matadorprobr.itch.io/bettercrewlink' ||
                store.get('serverURL') === 'https://gamebanana.com/tools/7079' ||
                store.get('serverURL') === 'https://web.bettercrewl.ink' ||
                store.get('serverURL') === 'https://obs.bettercrewlink.app' ||
                store.get('serverURL') === 'https://discord.gg/qDqTzvj4SH') {
                store.set('serverURL', 'https://bettercrewl.ink');
            }
        },
        '2.0.7': (store) => {
            if (store.get('serverURL') === 'http://bettercrewl.ink' ||
                store.get('serverURL') === 'https://bettercrewlink.app' ||
                store.get('serverURL') === 'http://bettercrewlink.app' ||
                store.get('serverURL') === 'https://bettercrewlink.app/' ||
                store.get('serverURL') === 'http://bettercrewlink.app/' ||
                store.get('serverURL') === 'https://bettercrewl.ink:6523' ||
                store.get('serverURL') === 'http://bettercrewl.ink:6523' ||
                store.get('serverURL') === 'https://crewlink.guus.info' ||
                store.get('serverURL') === 'http://crewlink.guus.info' ||
                store.get('serverURL') === 'https://crewlink.guus.ninja' ||
                store.get('serverURL') === 'http://crewlink.guus.ninja' ||
                store.get('serverURL') === 'https://github.com/OhMyGuus/BetterCrewLink' ||
                store.get('serverURL') === 'https://mirror.bettercrewl.ink' ||
                store.get('serverURL') === 'https://mirror.bettercrewl.ink/' ||
                store.get('serverURL') === 'https://www.curseforge.com/among-us/all-mods/bettercrewlink-proximity-chat' ||
                store.get('serverURL') === 'https://matadorprobr.itch.io/bettercrewlink' ||
                store.get('serverURL') === 'https://gamebanana.com/tools/7079' ||
                store.get('serverURL') === 'https://web.bettercrewl.ink' ||
                store.get('serverURL') === 'https://obs.bettercrewlink.app' ||
                store.get('serverURL') === 'https://discord.gg/qDqTzvj4SH') {
                store.set('serverURL', 'https://bettercrewl.ink');
            }
        },
        '2.1.4': (store) => {
            store.set('playerConfigMap', {});
        },
        '2.2.0': (store) => {
            store.set('mobileHost', true);
        },
        '2.2.5': (store) => {
            const pushToTalkValue = store.get('pushToTalk');
            if (typeof pushToTalkValue === 'boolean') {
                store.set('pushToTalkMode', pushToTalkValue ? pushToTalkOptions.PUSH_TO_TALK : pushToTalkOptions.VOICE);
            }
            // @ts-ignore
            store.delete('pushToTalk');
        },
        '2.3.6': (store) => {
            if (store.get('serverURL').includes('//crewl.ink'))
                store.set('serverURL', 'https://bettercrewl.ink');
        },
        '2.4.0': (store) => {
            const currentSensitivity = store.get('micSensitivity');
            if (currentSensitivity >= 0.3) {
                store.set('micSensitivity', 0.15);
                store.set('micSensitivityEnabled', false);
            }
        },
        '2.7.2': (store) => {
            store.set('useRHSJokes', true);
        },
    },
    schema: {
        alwaysOnTop: {
            type: 'boolean',
            default: false,
        },
        language: {
            type: 'string',
            default: 'unkown',
        },
        microphone: {
            type: 'string',
            default: 'Default',
        },
        speaker: {
            type: 'string',
            default: 'Default',
        },
        pushToTalkMode: {
            type: 'number',
            default: pushToTalkOptions.VOICE,
        },
        serverURL: {
            type: 'string',
            default: 'https://bettercrewl.ink',
            format: 'uri',
        },
        pushToTalkShortcut: {
            type: 'string',
            default: 'V',
        },
        deafenShortcut: {
            type: 'string',
            default: 'RControl',
        },
        impostorRadioShortcut: {
            type: 'string',
            default: 'F',
        },
        muteShortcut: {
            type: 'string',
            default: 'RAlt',
        },
        hideCode: {
            type: 'boolean',
            default: false,
        },
        compactOverlay: {
            type: 'boolean',
            default: false,
        },
        overlayPosition: {
            type: 'string',
            default: 'right',
        },
        meetingOverlay: {
            type: 'boolean',
            default: true,
        },
        enableOverlay: {
            type: 'boolean',
            default: true,
        },
        ghostVolume: {
            type: 'number',
            default: 100,
        },
        masterVolume: {
            type: 'number',
            default: 100,
        },
        microphoneGain: {
            type: 'number',
            default: 100,
        },
        microphoneGainEnabled: {
            type: 'boolean',
            default: false,
        },
        micSensitivity: {
            type: 'number',
            default: 0.15,
        },
        micSensitivityEnabled: {
            type: 'boolean',
            default: false,
        },
        natFix: {
            type: 'boolean',
            default: false,
        },
        mobileHost: {
            type: 'boolean',
            default: true,
        },
        vadEnabled: {
            type: 'boolean',
            default: true,
        },
        hardware_acceleration: {
            type: 'boolean',
            default: true,
        },
        enableSpatialAudio: {
            type: 'boolean',
            default: true,
        },
        obsSecret: {
            type: 'string',
            default: undefined,
        },
        obsOverlay: {
            type: 'boolean',
            default: false,
        },
        echoCancellation: {
            type: 'boolean',
            default: true,
        },
        noiseSuppression: {
            type: 'boolean',
            default: true,
        },
        playerConfigMap: {
            type: 'object',
            default: {},
            additionalProperties: {
                type: 'object',
                properties: {
                    volume: {
                        type: 'number',
                        default: 1,
                    },
                    isMuted: {
                        type: 'boolean',
                        default: false,
                    },
                },
            },
        },
        localLobbySettings: {
            type: 'object',
            properties: {
                maxDistance: {
                    type: 'number',
                    default: 5.32,
                },
                haunting: {
                    type: 'boolean',
                    default: false,
                },
                commsSabotage: {
                    type: 'boolean',
                    default: false,
                },
                hearImpostorsInVents: {
                    type: 'boolean',
                    default: false,
                },
                impostersHearImpostersInvent: {
                    type: 'boolean',
                    default: false,
                },
                impostorRadioEnabled: {
                    type: 'boolean',
                    default: false,
                },
                deadOnly: {
                    type: 'boolean',
                    default: false,
                },
                meetingGhostOnly: {
                    type: 'boolean',
                    default: false,
                },
                visionHearing: {
                    type: 'boolean',
                    default: false,
                },
                hearThroughCameras: {
                    type: 'boolean',
                    default: false,
                },
                wallsBlockAudio: {
                    type: 'boolean',
                    default: false,
                },
                publicLobby_on: {
                    type: 'boolean',
                    default: false,
                },
                publicLobby_title: {
                    type: 'string',
                    default: '',
                },
                publicLobby_language: {
                    type: 'string',
                    default: 'en',
                },
                publicLobby_mods: {
                    type: 'string',
                    default: 'NONE',
                },
            },
            default: {
                maxDistance: 5.32,
                haunting: false,
                commsSabotage: false,
                hearImpostorsInVents: false,
                hearThroughCameras: false,
                wallsBlockAudio: false,
                deadOnly: false,
                meetingGhostOnly: false,
                visionHearing: false,
                publicLobby_on: false,
                publicLobby_title: '',
                publicLobby_language: 'en',
                publicLobby_mods: 'NONE',
            },
        },
        useRHSJokes: {
            type: 'boolean',
            default: true
        },
        launchPlatform: {
            type: 'string',
            default: GamePlatform.STEAM,
        },
        customPlatforms: {
            type: 'object',
            default: {},
            additionalProperties: {
                type: 'object',
                properties: {
                    default: {
                        type: 'boolean',
                        default: false,
                    },
                    key: {
                        type: 'string',
                        default: '',
                    },
                    launchType: {
                        type: 'string',
                        default: 'EXE',
                    },
                    runPath: {
                        type: 'string',
                        default: '',
                    },
                    execute: {
                        type: 'array',
                        default: [''],
                        items: {
                            type: 'string',
                            default: '',
                        },
                    },
                    translateKey: {
                        type: 'string',
                        default: '',
                    },
                },
            },
        },
    },
});
export const settingsReducer = (state, action) => {
    if (action.type === 'set') {
        return action.action;
    }
    const v = action.action;
    if (action.type === 'setLobbySetting') {
        const lobbySettings = Object.assign(Object.assign({}, state.localLobbySettings), { [v[0]]: v[1] });
        v[0] = 'localLobbySettings';
        v[1] = lobbySettings;
    }
    store.set(v[0], v[1]);
    return Object.assign(Object.assign({}, state), { [v[0]]: v[1] });
};
export const lobbySettingsReducer = (state, action) => {
    if (action.type === 'set')
        return action.action;
    const v = action.action;
    return Object.assign(Object.assign({}, state), { [v[0]]: v[1] });
};
const DisabledTooltip = function ({ disabled, children, title }) {
    if (disabled)
        return (React.createElement(Tooltip, { placement: "top", arrow: true, title: title },
            React.createElement("span", null, children)));
    else
        return React.createElement(React.Fragment, null, children);
};
const Settings = function ({ t, open, onClose }) {
    const classes = useStyles({ open });
    const [settings, setSettings] = useContext(SettingsContext);
    const gameState = useContext(GameStateContext);
    const [lobbySettings, setLobbySettings] = useContext(LobbySettingsContext);
    const [unsavedCount, setUnsavedCount] = useState(0);
    const unsaved = unsavedCount > 2;
    useEffect(() => {
        setSettings({
            type: 'set',
            action: store.store,
        });
        setLobbySettings({
            type: 'set',
            action: store.get('localLobbySettings'),
        });
    }, []);
    useEffect(() => {
        setUnsavedCount((s) => s + 1);
    }, [
        settings.microphone,
        settings.speaker,
        settings.serverURL,
        settings.vadEnabled,
        settings.hardware_acceleration,
        settings.natFix,
        settings.noiseSuppression,
        settings.echoCancellation,
        settings.mobileHost,
        settings.microphoneGainEnabled,
        settings.micSensitivityEnabled,
    ]);
    useEffect(() => {
        ipcRenderer.send('setAlwaysOnTop', settings.alwaysOnTop);
    }, [settings.alwaysOnTop]);
    useEffect(() => {
        ipcRenderer.send('enableOverlay', settings.enableOverlay);
    }, [settings.enableOverlay]);
    const [devices, setDevices] = useState([]);
    const [_, updateDevices] = useReducer((state) => state + 1, 0);
    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then((devices) => setDevices(devices.map((d) => {
            let label = d.label;
            if (d.deviceId === 'default') {
                label = t('buttons.default');
            }
            else {
                const match = /.+?\([^(]+\)/.exec(d.label);
                if (match && match[0])
                    label = match[0];
            }
            return {
                id: d.deviceId,
                kind: d.kind,
                label,
            };
        })));
    }, [_]);
    const setShortcut = (ev, shortcut) => {
        //	console.log(ev, shortcut);
        let k = ev.key;
        if (k.length === 1)
            k = k.toUpperCase();
        else if (k.startsWith('Arrow'))
            k = k.substring(5);
        if (k === ' ')
            k = 'Space';
        /* @ts-ignore */
        const c = ev.code;
        if (c && c.startsWith('Numpad')) {
            k = c;
        }
        if (k === 'Control' || k === 'Alt' || k === 'Shift')
            k = (ev.location === 1 ? 'L' : 'R') + k;
        if (/^[0-9A-Z]$/.test(k) || /^F[0-9]{1,2}$/.test(k) || keys.has(k) || k.startsWith('Numpad')) {
            if (k === 'Escape') {
                console.log('disable??');
                k = 'Disabled';
            }
            setSettings({
                type: 'setOne',
                action: [shortcut, k],
            });
            ipcRenderer.send(IpcHandlerMessages.RESET_KEYHOOKS);
        }
    };
    const setMouseShortcut = (ev, shortcut) => {
        if (ev.button > 2) {
            // this makes our button start at 1 instead of 0
            // React Mouse event starts at 0, but IOHooks starts at 1
            const k = `MouseButton${ev.button + 1}`;
            setSettings({
                type: 'setOne',
                action: [shortcut, k],
            });
            ipcRenderer.send(IpcHandlerMessages.RESET_KEYHOOKS);
        }
    };
    const resetDefaults = () => {
        store.clear();
        setSettings({
            type: 'set',
            action: store.store,
        });
        // I'm like 90% sure this isn't necessary but whenever you click the mic/speaker dropdown it is called, so it may be necessary
        // updateDevices();
        // This is necessary for resetting hotkeys properly, the main thread needs to be notified to reset the hooks
        ipcRenderer.send(IpcHandlerMessages.RESET_KEYHOOKS);
        location.reload();
    };
    const microphones = devices.filter((d) => d.kind === 'audioinput');
    const speakers = devices.filter((d) => d.kind === 'audiooutput');
    const [localLobbySettings, setLocalLobbySettings] = useState(settings.localLobbySettings);
    useEffect(() => {
        setLocalLobbySettings(settings.localLobbySettings);
    }, [settings.localLobbySettings]);
    useEffect(() => {
        console.log(settings.language);
        if (settings.language === 'unkown') {
            const locale = app.getLocale();
            const lang = Object.keys(languages).includes(locale)
                ? locale
                : Object.keys(languages).includes(locale.split('-')[0])
                    ? locale.split('-')[0]
                    : undefined;
            if (lang) {
                settings.language = lang;
                setSettings({
                    type: 'setOne',
                    action: ['language', settings.language],
                });
            }
        }
        i18next.changeLanguage(settings.language);
    }, [settings.language]);
    const isInMenuOrLobby = (gameState === null || gameState === void 0 ? void 0 : gameState.gameState) === GameState.LOBBY || (gameState === null || gameState === void 0 ? void 0 : gameState.gameState) === GameState.MENU;
    const canChangeLobbySettings = (gameState === null || gameState === void 0 ? void 0 : gameState.gameState) === GameState.MENU || ((gameState === null || gameState === void 0 ? void 0 : gameState.isHost) && (gameState === null || gameState === void 0 ? void 0 : gameState.gameState) === GameState.LOBBY);
    const canResetSettings = (gameState === null || gameState === void 0 ? void 0 : gameState.gameState) === undefined ||
        !(gameState === null || gameState === void 0 ? void 0 : gameState.isHost) ||
        gameState.gameState === GameState.MENU ||
        gameState.gameState === GameState.LOBBY;
    const [warningDialog, setWarningDialog] = React.useState({ open: false });
    const handleWarningDialogClose = (confirm) => {
        if (confirm && warningDialog.confirmCallback) {
            warningDialog.confirmCallback();
        }
        setWarningDialog({ open: false });
    };
    const openWarningDialog = (dialogTitle, dialogDescription, confirmCallback, showDialog) => {
        if (!showDialog) {
            if (confirmCallback)
                confirmCallback();
        }
        else {
            setWarningDialog({ title: dialogTitle, description: dialogDescription, open: true, confirmCallback });
        }
    };
    const URLInputCallback = useCallback((url) => {
        setSettings({
            type: 'setOne',
            action: ['serverURL', url],
        });
    }, []);
    const SavePublicLobbyCallback = useCallback((setting, newValue) => {
        // @ts-ignore
        setLocalLobbySettings(Object.assign(Object.assign({}, localLobbySettings), { setting: newValue }));
        setSettings({
            type: 'setLobbySetting',
            action: [setting, newValue],
        });
    }, []);
    if (!open) {
        return React.createElement(React.Fragment, null);
    }
    return (React.createElement(Box, { className: classes.root },
        React.createElement("div", { className: classes.header },
            React.createElement(IconButton, { className: classes.back, size: "small", onClick: () => {
                    // setSettings({
                    // 	type: 'setOne',
                    // 	action: ['localLobbySettings', lobbySettings],
                    // });
                    if (unsaved) {
                        onClose();
                        location.reload();
                    }
                    else
                        onClose();
                } },
                React.createElement(ChevronLeft, { htmlColor: "#777" })),
            React.createElement(Typography, { variant: "h6" }, t('settings.title'))),
        React.createElement("div", { className: classes.scroll },
            React.createElement("div", null,
                React.createElement(Dialog, { open: warningDialog.open, onClose: handleWarningDialogClose, "aria-labelledby": "alert-dialog-title", "aria-describedby": "alert-dialog-description" },
                    React.createElement(DialogTitle, { id: "alert-dialog-title" }, warningDialog.title),
                    React.createElement(DialogContent, null,
                        React.createElement(DialogContentText, { id: "alert-dialog-description" }, warningDialog.description)),
                    React.createElement(DialogActions, null,
                        React.createElement(Button, { onClick: () => handleWarningDialogClose(true), color: "primary" }, t('buttons.confirm')),
                        React.createElement(Button, { onClick: () => handleWarningDialogClose(false), color: "primary", autoFocus: true }, t('buttons.cancel'))))),
            React.createElement(Typography, { variant: "h6" }, t('settings.lobbysettings.title')),
            React.createElement("div", null,
                React.createElement(Typography, { id: "input-slider", gutterBottom: true },
                    (canChangeLobbySettings ? localLobbySettings.visionHearing : lobbySettings.visionHearing)
                        ? t('settings.lobbysettings.voicedistance_impostor')
                        : t('settings.lobbysettings.voicedistance'),
                    ": ",
                    canChangeLobbySettings ? localLobbySettings.maxDistance : lobbySettings.maxDistance),
                React.createElement(DisabledTooltip, { disabled: !canChangeLobbySettings, title: isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly') },
                    React.createElement(Slider, { disabled: !canChangeLobbySettings, value: canChangeLobbySettings ? localLobbySettings.maxDistance : lobbySettings.maxDistance, min: 1, max: 10, step: 0.1, onChange: (_, newValue) => {
                            localLobbySettings.maxDistance = newValue;
                            setLocalLobbySettings(localLobbySettings);
                        }, onChangeCommitted: (_, newValue) => {
                            setSettings({
                                type: 'setLobbySetting',
                                action: ['maxDistance', newValue],
                            });
                        } }))),
            React.createElement("div", null,
                React.createElement(DisabledTooltip, { disabled: !canChangeLobbySettings, title: isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly') },
                    React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.lobbysettings.public_lobby.enabled'), disabled: !canChangeLobbySettings, onChange: (_, newValue) => {
                            openWarningDialog(t('settings.warning'), t('settings.lobbysettings.public_lobby.enable_warning'), () => {
                                localLobbySettings.publicLobby_on = newValue;
                                setLocalLobbySettings(localLobbySettings);
                                setSettings({
                                    type: 'setLobbySetting',
                                    action: ['publicLobby_on', newValue],
                                });
                            }, !localLobbySettings.publicLobby_on);
                        }, value: canChangeLobbySettings ? localLobbySettings.publicLobby_on : lobbySettings.publicLobby_on, checked: canChangeLobbySettings ? localLobbySettings.publicLobby_on : lobbySettings.publicLobby_on, control: React.createElement(Checkbox, null) })),
                React.createElement(DisabledTooltip, { disabled: !canChangeLobbySettings, title: isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly') },
                    React.createElement(PublicLobbySettings, { t: t, updateSetting: SavePublicLobbyCallback, lobbySettings: canChangeLobbySettings ? localLobbySettings : lobbySettings, canChange: canChangeLobbySettings, className: classes.dialog })),
                React.createElement(DisabledTooltip, { disabled: !canChangeLobbySettings, title: isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly') },
                    React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.lobbysettings.wallsblockaudio'), disabled: !canChangeLobbySettings, onChange: (_, newValue) => {
                            localLobbySettings.wallsBlockAudio = newValue;
                            setLocalLobbySettings(localLobbySettings);
                            setSettings({
                                type: 'setLobbySetting',
                                action: ['wallsBlockAudio', newValue],
                            });
                        }, value: canChangeLobbySettings ? localLobbySettings.wallsBlockAudio : lobbySettings.wallsBlockAudio, checked: canChangeLobbySettings ? localLobbySettings.wallsBlockAudio : lobbySettings.wallsBlockAudio, control: React.createElement(Checkbox, null) })),
                React.createElement(DisabledTooltip, { disabled: !canChangeLobbySettings, title: isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly') },
                    React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.lobbysettings.visiononly'), disabled: !canChangeLobbySettings, onChange: (_, newValue) => {
                            // openWarningDialog(
                            // 	'Be aware!',
                            // 	'Imposters and original crewlink users still use the voice distance setting',
                            // 	() => {
                            localLobbySettings.visionHearing = newValue;
                            setSettings({
                                type: 'setLobbySetting',
                                action: ['visionHearing', newValue],
                            });
                            setLocalLobbySettings(localLobbySettings);
                            // 	},
                            // 	newValue
                            // );
                        }, value: canChangeLobbySettings ? localLobbySettings.visionHearing : lobbySettings.visionHearing, checked: canChangeLobbySettings ? localLobbySettings.visionHearing : lobbySettings.visionHearing, control: React.createElement(Checkbox, null) })),
                React.createElement(DisabledTooltip, { disabled: !canChangeLobbySettings, title: isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly') },
                    React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.lobbysettings.impostorshearsghost'), disabled: !canChangeLobbySettings, onChange: (_, newValue) => {
                            localLobbySettings.haunting = newValue;
                            setLocalLobbySettings(localLobbySettings);
                            setSettings({
                                type: 'setLobbySetting',
                                action: ['haunting', newValue],
                            });
                        }, value: canChangeLobbySettings ? localLobbySettings.haunting : lobbySettings.haunting, checked: canChangeLobbySettings ? localLobbySettings.haunting : lobbySettings.haunting, control: React.createElement(Checkbox, null) })),
                React.createElement(DisabledTooltip, { disabled: !canChangeLobbySettings, title: isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly') },
                    React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.lobbysettings.hear_imposters_invents'), disabled: !canChangeLobbySettings, onChange: (_, newValue) => {
                            localLobbySettings.hearImpostorsInVents = newValue;
                            setLocalLobbySettings(localLobbySettings);
                            setSettings({
                                type: 'setLobbySetting',
                                action: ['hearImpostorsInVents', newValue],
                            });
                        }, value: canChangeLobbySettings ? localLobbySettings.hearImpostorsInVents : lobbySettings.hearImpostorsInVents, checked: canChangeLobbySettings ? localLobbySettings.hearImpostorsInVents : lobbySettings.hearImpostorsInVents, control: React.createElement(Checkbox, null) })),
                React.createElement(DisabledTooltip, { disabled: !canChangeLobbySettings, title: isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly') },
                    React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.lobbysettings.private_talk_invents'), disabled: !canChangeLobbySettings, onChange: (_, newValue) => {
                            localLobbySettings.impostersHearImpostersInvent = newValue;
                            setLocalLobbySettings(localLobbySettings);
                            setSettings({
                                type: 'setLobbySetting',
                                action: ['impostersHearImpostersInvent', newValue],
                            });
                        }, value: canChangeLobbySettings
                            ? localLobbySettings.impostersHearImpostersInvent
                            : lobbySettings.impostersHearImpostersInvent, checked: canChangeLobbySettings
                            ? localLobbySettings.impostersHearImpostersInvent
                            : lobbySettings.impostersHearImpostersInvent, control: React.createElement(Checkbox, null) })),
                React.createElement(DisabledTooltip, { disabled: !canChangeLobbySettings, title: isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly') },
                    React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.lobbysettings.comms_sabotage_audio'), disabled: !canChangeLobbySettings, onChange: (_, newValue) => {
                            localLobbySettings.commsSabotage = newValue;
                            setLocalLobbySettings(localLobbySettings);
                            setSettings({
                                type: 'setLobbySetting',
                                action: ['commsSabotage', newValue],
                            });
                        }, value: canChangeLobbySettings ? localLobbySettings.commsSabotage : lobbySettings.commsSabotage, checked: canChangeLobbySettings ? localLobbySettings.commsSabotage : lobbySettings.commsSabotage, control: React.createElement(Checkbox, null) })),
                React.createElement(DisabledTooltip, { disabled: !canChangeLobbySettings, title: isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly') },
                    React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.lobbysettings.hear_through_cameras'), disabled: !canChangeLobbySettings, onChange: (_, newValue) => {
                            localLobbySettings.hearThroughCameras = newValue;
                            setLocalLobbySettings(localLobbySettings);
                            setSettings({
                                type: 'setLobbySetting',
                                action: ['hearThroughCameras', newValue],
                            });
                        }, value: canChangeLobbySettings ? localLobbySettings.hearThroughCameras : lobbySettings.hearThroughCameras, checked: canChangeLobbySettings ? localLobbySettings.hearThroughCameras : lobbySettings.hearThroughCameras, control: React.createElement(Checkbox, null) })),
                React.createElement(DisabledTooltip, { disabled: !canChangeLobbySettings, title: isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly') },
                    React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.lobbysettings.impostor_radio'), disabled: !canChangeLobbySettings, onChange: (_, newValue) => {
                            localLobbySettings.impostorRadioEnabled = newValue;
                            setLocalLobbySettings(localLobbySettings);
                            setSettings({
                                type: 'setLobbySetting',
                                action: ['impostorRadioEnabled', newValue],
                            });
                        }, value: canChangeLobbySettings ? localLobbySettings.impostorRadioEnabled : lobbySettings.impostorRadioEnabled, checked: canChangeLobbySettings ? localLobbySettings.impostorRadioEnabled : lobbySettings.impostorRadioEnabled, control: React.createElement(Checkbox, null) })),
                React.createElement(DisabledTooltip, { disabled: !canChangeLobbySettings, title: isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly') },
                    React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.lobbysettings.ghost_only'), disabled: !canChangeLobbySettings, onChange: (_, newValue) => {
                            console.log('new vlaue of setting: ', newValue);
                            openWarningDialog(t('settings.warning'), t('settings.lobbysettings.ghost_only_warning'), () => {
                                localLobbySettings.meetingGhostOnly = false;
                                localLobbySettings.deadOnly = newValue;
                                setSettings({
                                    type: 'setLobbySetting',
                                    action: ['meetingGhostOnly', false],
                                });
                                setSettings({
                                    type: 'setLobbySetting',
                                    action: ['deadOnly', newValue],
                                });
                                setLocalLobbySettings(localLobbySettings);
                            }, newValue);
                        }, value: canChangeLobbySettings ? localLobbySettings.deadOnly : lobbySettings.deadOnly, checked: canChangeLobbySettings ? localLobbySettings.deadOnly : lobbySettings.deadOnly, control: React.createElement(Checkbox, null) })),
                React.createElement(DisabledTooltip, { disabled: !canChangeLobbySettings, title: isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly') },
                    React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.lobbysettings.meetings_only'), disabled: !canChangeLobbySettings, onChange: (_, newValue) => {
                            console.log('new vlaue of setting: ', newValue);
                            openWarningDialog(t('settings.warning'), t('settings.lobbysettings.meetings_only_warning'), () => {
                                localLobbySettings.meetingGhostOnly = newValue;
                                localLobbySettings.deadOnly = false;
                                setSettings({
                                    type: 'setLobbySetting',
                                    action: ['meetingGhostOnly', newValue],
                                });
                                setSettings({
                                    type: 'setLobbySetting',
                                    action: ['deadOnly', false],
                                });
                                setLocalLobbySettings(localLobbySettings);
                            }, newValue);
                        }, value: canChangeLobbySettings ? localLobbySettings.meetingGhostOnly : lobbySettings.meetingGhostOnly, checked: canChangeLobbySettings ? localLobbySettings.meetingGhostOnly : lobbySettings.meetingGhostOnly, control: React.createElement(Checkbox, null) }))),
            React.createElement(Divider, null),
            React.createElement(Typography, { variant: "h6" }, t('settings.audio.title')),
            React.createElement(TextField, { select: true, label: t('settings.audio.microphone'), variant: "outlined", color: "secondary", value: settings.microphone, className: classes.shortcutField, SelectProps: { native: true }, InputLabelProps: { shrink: true }, onChange: (ev) => {
                    setSettings({
                        type: 'setOne',
                        action: ['microphone', ev.target.value],
                    });
                }, onClick: updateDevices }, microphones.map((d) => (React.createElement("option", { key: d.id, value: d.id }, d.label)))),
            open && React.createElement(MicrophoneSoundBar, { microphone: settings.microphone }),
            React.createElement(TextField, { select: true, label: t('settings.audio.speaker'), variant: "outlined", color: "secondary", value: settings.speaker, className: classes.shortcutField, SelectProps: { native: true }, InputLabelProps: { shrink: true }, onChange: (ev) => {
                    setSettings({
                        type: 'setOne',
                        action: ['speaker', ev.target.value],
                    });
                }, onClick: updateDevices }, speakers.map((d) => (React.createElement("option", { key: d.id, value: d.id }, d.label)))),
            open && React.createElement(TestSpeakersButton, { t: t, speaker: settings.speaker }),
            React.createElement(RadioGroup, { value: settings.pushToTalkMode, onChange: (ev) => {
                    setSettings({
                        type: 'setOne',
                        action: ['pushToTalkMode', Number(ev.target.value)],
                    });
                } },
                React.createElement(FormControlLabel, { label: t('settings.audio.voice_activity'), value: pushToTalkOptions.VOICE, control: React.createElement(Radio, null) }),
                React.createElement(FormControlLabel, { label: t('settings.audio.push_to_talk'), value: pushToTalkOptions.PUSH_TO_TALK, control: React.createElement(Radio, null) }),
                React.createElement(FormControlLabel, { label: t('settings.audio.push_to_mute'), value: pushToTalkOptions.PUSH_TO_MUTE, control: React.createElement(Radio, null) })),
            React.createElement(Divider, null),
            React.createElement("div", null,
                React.createElement(Typography, { id: "input-slider", gutterBottom: true }, t('settings.audio.microphone_volume')),
                React.createElement(Grid, { container: true, spacing: 2 },
                    React.createElement(Grid, { item: true, xs: 3 },
                        React.createElement(Checkbox, { checked: settings.microphoneGainEnabled, onChange: (_, checked) => {
                                setSettings({
                                    type: 'setOne',
                                    action: ['microphoneGainEnabled', checked],
                                });
                            } })),
                    React.createElement(Grid, { item: true, xs: 8, style: {
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                        } },
                        React.createElement(Slider, { disabled: !settings.microphoneGainEnabled, value: settings.microphoneGain, valueLabelDisplay: "auto", min: 0, max: 300, step: 1, onChange: (_, newValue) => {
                                setSettings({
                                    type: 'setOne',
                                    action: ['microphoneGain', newValue],
                                });
                            }, "aria-labelledby": "input-slider" }))),
                React.createElement(Typography, { id: "input-slider", gutterBottom: true }, t('settings.audio.microphone_sens')),
                React.createElement(Grid, { container: true, spacing: 2 },
                    React.createElement(Grid, { item: true, xs: 3 },
                        React.createElement(Checkbox, { checked: settings.micSensitivityEnabled, onChange: (_, checked) => {
                                setSettings({
                                    type: 'setOne',
                                    action: ['micSensitivityEnabled', checked],
                                });
                            } })),
                    React.createElement(Grid, { item: true, xs: 8, style: {
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                        } },
                        React.createElement(Slider, { disabled: !settings.micSensitivityEnabled, value: +(1 - settings.micSensitivity).toFixed(2), valueLabelDisplay: "auto", min: 0, max: 1, color: settings.micSensitivity < 0.3 ? 'primary' : 'secondary', step: 0.05, onChange: (_, newValue) => {
                                openWarningDialog(t('settings.warning'), t('settings.audio.microphone_sens_warning'), () => {
                                    setSettings({
                                        type: 'setOne',
                                        action: ['micSensitivity', 1 - newValue],
                                    });
                                }, newValue == 0.7 && settings.micSensitivity < 0.3);
                            }, "aria-labelledby": "input-slider" }))),
                React.createElement(Divider, null),
                React.createElement(Typography, { id: "input-slider", gutterBottom: true }, t('settings.audio.crewvolume')),
                React.createElement(Grid, { container: true, direction: "row", justify: "center", alignItems: "center" },
                    React.createElement(Grid, { item: true, xs: 11 },
                        React.createElement(Slider, { value: settings.ghostVolume, valueLabelDisplay: "auto", onChange: (_, newValue) => {
                                setSettings({
                                    type: 'setOne',
                                    action: ['ghostVolume', newValue],
                                });
                            }, "aria-labelledby": "input-slider" }))),
                React.createElement(Typography, { id: "input-slider", gutterBottom: true }, t('settings.audio.mastervolume')),
                React.createElement(Grid, { container: true, direction: "row", justify: "center", alignItems: "center" },
                    React.createElement(Grid, { item: true, xs: 11 },
                        React.createElement(Slider, { value: settings.masterVolume, valueLabelDisplay: "auto", max: 200, onChange: (_, newValue) => {
                                setSettings({
                                    type: 'setOne',
                                    action: ['masterVolume', newValue],
                                });
                            }, "aria-labelledby": "input-slider" })))),
            React.createElement(Divider, null),
            React.createElement(Typography, { variant: "h6" }, t('settings.keyboard.title')),
            React.createElement(Grid, { container: true, spacing: 1 },
                React.createElement(Grid, { item: true, xs: 6 },
                    React.createElement(TextField, { fullWidth: true, spellCheck: false, color: "secondary", label: t('settings.keyboard.push_to_talk'), value: settings.pushToTalkShortcut, className: classes.shortcutField, variant: "outlined", onKeyDown: (ev) => {
                            setShortcut(ev, 'pushToTalkShortcut');
                        }, onMouseDown: (ev) => {
                            setMouseShortcut(ev, 'pushToTalkShortcut');
                        } })),
                React.createElement(Grid, { item: true, xs: 6 },
                    React.createElement(TextField, { spellCheck: false, color: "secondary", label: t('settings.keyboard.impostor_radio'), value: settings.impostorRadioShortcut, className: classes.shortcutField, variant: "outlined", onKeyDown: (ev) => {
                            setShortcut(ev, 'impostorRadioShortcut');
                        }, onMouseDown: (ev) => {
                            setMouseShortcut(ev, 'impostorRadioShortcut');
                        } })),
                React.createElement(Grid, { item: true, xs: 6 },
                    React.createElement(TextField, { spellCheck: false, color: "secondary", label: t('settings.keyboard.mute'), value: settings.muteShortcut, className: classes.shortcutField, variant: "outlined", onKeyDown: (ev) => {
                            setShortcut(ev, 'muteShortcut');
                        }, onMouseDown: (ev) => {
                            setMouseShortcut(ev, 'muteShortcut');
                        } })),
                React.createElement(Grid, { item: true, xs: 6 },
                    React.createElement(TextField, { spellCheck: false, color: "secondary", label: t('settings.keyboard.deafen'), value: settings.deafenShortcut, className: classes.shortcutField, variant: "outlined", onKeyDown: (ev) => {
                            setShortcut(ev, 'deafenShortcut');
                        }, onMouseDown: (ev) => {
                            setMouseShortcut(ev, 'deafenShortcut');
                        } }))),
            React.createElement(Divider, null),
            React.createElement(Typography, { variant: "h6" }, t('settings.overlay.title')),
            React.createElement("div", null,
                React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.overlay.always_on_top'), checked: settings.alwaysOnTop, onChange: (_, checked) => {
                        setSettings({
                            type: 'setOne',
                            action: ['alwaysOnTop', checked],
                        });
                    }, control: React.createElement(Checkbox, null) }),
                React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.overlay.enabled'), checked: settings.enableOverlay, onChange: (_, checked) => {
                        setSettings({
                            type: 'setOne',
                            action: ['enableOverlay', checked],
                        });
                    }, control: React.createElement(Checkbox, null) }),
                settings.enableOverlay && (React.createElement(React.Fragment, null,
                    React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.overlay.compact'), checked: settings.compactOverlay, onChange: (_, checked) => {
                            setSettings({
                                type: 'setOne',
                                action: ['compactOverlay', checked],
                            });
                        }, control: React.createElement(Checkbox, null) }),
                    React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.overlay.meeting'), checked: settings.meetingOverlay, onChange: (_, checked) => {
                            setSettings({
                                type: 'setOne',
                                action: ['meetingOverlay', checked],
                            });
                        }, control: React.createElement(Checkbox, null) }),
                    React.createElement(TextField, { fullWidth: true, select: true, label: t('settings.overlay.pos'), variant: "outlined", color: "secondary", value: settings.overlayPosition, className: classes.shortcutField, SelectProps: { native: true }, InputLabelProps: { shrink: true }, onChange: (ev) => {
                            setSettings({
                                type: 'setOne',
                                action: ['overlayPosition', ev.target.value],
                            });
                        }, onClick: updateDevices },
                        React.createElement("option", { value: "hidden" }, t('settings.overlay.locations.hidden')),
                        React.createElement("option", { value: "top" }, t('settings.overlay.locations.top')),
                        React.createElement("option", { value: "bottom_left" }, t('settings.overlay.locations.bottom')),
                        React.createElement("option", { value: "right" }, t('settings.overlay.locations.right')),
                        React.createElement("option", { value: "right1" }, t('settings.overlay.locations.right1')),
                        React.createElement("option", { value: "left" }, t('settings.overlay.locations.left')),
                        React.createElement("option", { value: "left1" }, t('settings.overlay.locations.left1')))))),
            React.createElement(Divider, null),
            React.createElement(Typography, { variant: "h6" }, t('settings.advanced.title')),
            React.createElement("div", null,
                React.createElement(FormControlLabel, { label: t('settings.advanced.nat_fix'), checked: settings.natFix, onChange: (_, checked) => {
                        openWarningDialog(t('settings.warning'), t('settings.advanced.nat_fix_warning'), () => {
                            setSettings({
                                type: 'setOne',
                                action: ['natFix', checked],
                            });
                        }, checked);
                    }, control: React.createElement(Checkbox, null) })),
            React.createElement(ServerURLInput, { t: t, initialURL: settings.serverURL, onValidURL: URLInputCallback, className: classes.dialog }),
            React.createElement(Divider, null),
            React.createElement(Typography, { variant: "h6" }, t('settings.rhs.title')),
            React.createElement("div", null,
                React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.rhs.use_rhs_jokes'), checked: settings.useRHSJokes, onChange: (_, checked) => {
                        setSettings({
                            type: 'setOne',
                            action: ['useRHSJokes', checked],
                        });
                        console.log("opening warning");
                        openWarningDialog(t('settings.warning'), t('settings.rhs.reload_crewlink_warning'), () => {
                            location.reload();
                        }, true);
                    }, control: React.createElement(Checkbox, null) })),
            React.createElement(Divider, null),
            React.createElement(Typography, { variant: "h6" }, t('settings.beta.title')),
            React.createElement("div", null,
                React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.beta.mobilehost'), checked: settings.mobileHost, onChange: (_, checked) => {
                        setSettings({
                            type: 'setOne',
                            action: ['mobileHost', checked],
                        });
                    }, control: React.createElement(Checkbox, null) }),
                React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.beta.vad_enabled'), checked: settings.vadEnabled, onChange: (_, checked) => {
                        openWarningDialog(t('settings.warning'), t('settings.beta.vad_enabled_warning'), () => {
                            setSettings({
                                type: 'setOne',
                                action: ['vadEnabled', checked],
                            });
                        }, !checked);
                    }, control: React.createElement(Checkbox, null) }),
                React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.beta.hardware_acceleration'), checked: settings.hardware_acceleration, onChange: (_, checked) => {
                        openWarningDialog(t('settings.warning'), t('settings.beta.hardware_acceleration_warning'), () => {
                            setSettings({
                                type: 'setOne',
                                action: ['hardware_acceleration', checked],
                            });
                            app.relaunch();
                            app.exit();
                        }, !checked);
                    }, control: React.createElement(Checkbox, null) }),
                React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.beta.echocancellation'), checked: settings.echoCancellation, onChange: (_, checked) => {
                        setSettings({
                            type: 'setOne',
                            action: ['echoCancellation', checked],
                        });
                    }, control: React.createElement(Checkbox, null) }),
                React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.beta.spatial_audio'), checked: settings.enableSpatialAudio, onChange: (_, checked) => {
                        setSettings({
                            type: 'setOne',
                            action: ['enableSpatialAudio', checked],
                        });
                    }, control: React.createElement(Checkbox, null) }),
                React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.beta.noiseSuppression'), checked: settings.noiseSuppression, onChange: (_, checked) => {
                        setSettings({
                            type: 'setOne',
                            action: ['noiseSuppression', checked],
                        });
                    }, control: React.createElement(Checkbox, null) })),
            React.createElement(TextField, { fullWidth: true, select: true, label: t('settings.language'), variant: "outlined", color: "secondary", value: settings.language, className: classes.shortcutField, SelectProps: { native: true }, InputLabelProps: { shrink: true }, onChange: (ev) => {
                    setSettings({
                        type: 'setOne',
                        action: ['language', ev.target.value],
                    });
                } }, Object.entries(languages).map(([key, value]) => (React.createElement("option", { key: key, value: key }, value.name)))),
            React.createElement(Divider, null),
            React.createElement(Typography, { variant: "h6" }, t('settings.streaming.title')),
            React.createElement("div", null,
                React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.streaming.hidecode'), checked: !settings.hideCode, onChange: (_, checked) => {
                        setSettings({
                            type: 'setOne',
                            action: ['hideCode', !checked],
                        });
                    }, control: React.createElement(Checkbox, null) }),
                React.createElement(FormControlLabel, { className: classes.formLabel, label: t('settings.streaming.obs_overlay'), checked: settings.obsOverlay, onChange: (_, checked) => {
                        setSettings({
                            type: 'setOne',
                            action: ['obsOverlay', checked],
                        });
                        if (!settings.obsSecret) {
                            setSettings({
                                type: 'setOne',
                                action: ['obsSecret', Math.random().toString(36).substr(2, 9).toUpperCase()],
                            });
                        }
                    }, control: React.createElement(Checkbox, null) }),
                settings.obsOverlay && (React.createElement(React.Fragment, null,
                    React.createElement(TextField, { fullWidth: true, spellCheck: false, label: t('settings.streaming.obs_url'), value: `${settings.serverURL.includes('https') ? 'https' : 'http'}://obs.bettercrewlink.app/?compact=${settings.compactOverlay ? '1' : '0'}&position=${settings.overlayPosition}&meeting=${settings.meetingOverlay ? '1' : '0'}&secret=${settings.obsSecret}&server=${settings.serverURL}`, variant: "outlined", color: "primary", InputProps: {
                            readOnly: true,
                        } })))),
            React.createElement(Divider, null),
            React.createElement(Typography, { variant: "h6" }, t('settings.troubleshooting.title')),
            React.createElement("div", null,
                React.createElement(DisabledTooltip, { disabled: !canResetSettings, title: t('settings.troubleshooting.warning') },
                    React.createElement(Button, { disabled: !canResetSettings, variant: "contained", color: "secondary", onClick: () => openWarningDialog(t('settings.warning'), t('settings.troubleshooting.restore_warning'), () => {
                            resetDefaults();
                        }, true) }, t('settings.troubleshooting.restore')))),
            React.createElement(Alert, { className: classes.alert, severity: "info", style: { display: unsaved ? undefined : 'none' } }, t('buttons.exit')))));
};
export default Settings;
//# sourceMappingURL=Settings.js.map